'use strict';

// H2K CS 1.6 sidecar.
// Fetches h2k_events.jsonl over HTTP from the cs-web-server static endpoint
// (populated by the AMX plugin via fopen + existing data/→public/ symlink),
// verifies per-player match tokens, and POSTs signed match results to H2K.

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const EVENTS_URL   = process.env.EVENTS_URL   || 'http://cs16:27016/h2k_events.jsonl';
const OFFSET_FILE  = process.env.OFFSET_FILE  || '/state/events.offset';
const SEEN_FILE    = process.env.SEEN_FILE    || '/state/events.seen';
const WEBHOOK_URL  = process.env.H2K_WEBHOOK_URL || '';
const SECRET       = process.env.CS16_WEBHOOK_SECRET || '';
const POLL_MS      = Number(process.env.POLL_INTERVAL_MS || 1000);

if (!WEBHOOK_URL) { console.error('[sidecar] H2K_WEBHOOK_URL not set — refusing to start'); process.exit(1); }
if (!SECRET)      { console.error('[sidecar] CS16_WEBHOOK_SECRET not set — refusing to start'); process.exit(1); }

// ---------- Persistent state ----------

function loadOffset() {
    try {
        const n = parseInt(fs.readFileSync(OFFSET_FILE, 'utf8').trim(), 10);
        return Number.isFinite(n) && n >= 0 ? n : 0;
    } catch { return 0; }
}

function saveOffset(n) {
    try {
        fs.mkdirSync(path.dirname(OFFSET_FILE), { recursive: true });
        fs.writeFileSync(OFFSET_FILE, String(n));
    } catch (err) { console.error('[sidecar] failed to persist offset:', err.message); }
}

// Prevent duplicate POSTs for match_ends we've already forwarded (survives restart).
function loadSeen() {
    try {
        const raw = fs.readFileSync(SEEN_FILE, 'utf8').trim();
        return new Set(raw ? raw.split('\n').filter(Boolean) : []);
    } catch { return new Set(); }
}

function persistSeen(seen) {
    try {
        fs.mkdirSync(path.dirname(SEEN_FILE), { recursive: true });
        // Cap size so the file doesn't grow unboundedly — keep the most recent 1000 matchIds.
        const arr = Array.from(seen);
        const trimmed = arr.slice(-1000);
        fs.writeFileSync(SEEN_FILE, trimmed.join('\n'));
        if (trimmed.length < arr.length) {
            seen.clear();
            trimmed.forEach(m => seen.add(m));
        }
    } catch (err) { console.error('[sidecar] failed to persist seen:', err.message); }
}

// ---------- Token verification ----------

function b64urlDecode(str) {
    const pad = '='.repeat((4 - (str.length % 4)) % 4);
    return Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64');
}

function verifyToken(token) {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [body, sig] = parts;

    const expected = crypto.createHmac('sha256', SECRET).update(body).digest();
    const expectedB64 = expected.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expectedB64);
    if (sigBuf.length !== expBuf.length) return null;
    if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null;

    try {
        const payload = JSON.parse(b64urlDecode(body).toString('utf8'));
        if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
        return payload;
    } catch { return null; }
}

// ---------- Webhook POST with retry ----------

async function postMatchResult(payload, attempt = 1) {
    const body = JSON.stringify(payload);
    const signature = crypto.createHmac('sha256', SECRET).update(body).digest('hex');

    try {
        const res = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-H2K-Signature': signature },
            body,
        });
        if (res.ok) {
            console.log(`[sidecar] posted match_result for ${payload.matchId} (status ${res.status})`);
            return true;
        }
        // 404 = backend doesn't know this matchId (never registered, or already cleared). Don't retry.
        if (res.status === 404) {
            console.warn(`[sidecar] matchId ${payload.matchId} not recognized by backend — not retrying`);
            return true; // treat as delivered for seen-set purposes
        }
        console.error(`[sidecar] webhook non-2xx: ${res.status} ${await res.text().catch(() => '')}`);
    } catch (err) {
        console.error(`[sidecar] webhook POST failed (attempt ${attempt}):`, err.message);
    }

    if (attempt >= 3) {
        console.error(`[sidecar] giving up on ${payload.matchId} after 3 attempts — backend safety timer will refund`);
        return false;
    }
    const delayMs = 1000 * Math.pow(4, attempt - 1); // 1s, 4s, 16s
    await new Promise(r => setTimeout(r, delayMs));
    return postMatchResult(payload, attempt + 1);
}

// ---------- Event processing ----------

const seenMatchIds = loadSeen();

async function handleMatchEnd(event) {
    if (!event.matchId || seenMatchIds.has(event.matchId)) return;
    seenMatchIds.add(event.matchId);
    persistSeen(seenMatchIds);

    // Draw / double-disconnect → no winner to validate; forward with nulls so backend refunds.
    if (event.reason === 'draw' || !event.winner || event.winner.slot === 0) {
        await postMatchResult({
            matchId: event.matchId, winnerId: null, loserId: null,
            winnerKills: 0, loserKills: 0, reason: 'draw',
        });
        return;
    }

    const winnerPayload = verifyToken(event.winner.token);
    const loserPayload  = event.loser ? verifyToken(event.loser.token) : null;

    if (!winnerPayload) {
        console.error('[sidecar] winner token invalid — dropping event', event.matchId);
        return;
    }
    if (winnerPayload.matchId !== event.matchId) {
        console.error(`[sidecar] winner token matchId ${winnerPayload.matchId} != event ${event.matchId} — dropping`);
        return;
    }
    if (loserPayload && loserPayload.matchId !== event.matchId) {
        console.error(`[sidecar] loser token matchId ${loserPayload.matchId} != event ${event.matchId} — dropping`);
        return;
    }

    await postMatchResult({
        matchId: event.matchId,
        winnerId: winnerPayload.userId,
        loserId: loserPayload ? loserPayload.userId : null,
        winnerKills: event.winner.kills || 0,
        loserKills: event.loser ? (event.loser.kills || 0) : 0,
        reason: event.reason || 'killlimit',
    });
}

function processLine(line) {
    const trimmed = line.trim();
    if (!trimmed) return;
    let event;
    try { event = JSON.parse(trimmed); }
    catch { console.error('[sidecar] malformed JSON:', trimmed.slice(0, 200)); return; }
    if (event.type === 'match_end') void handleMatchEnd(event);
    // Other event types ignored in Phase A.
}

// ---------- Poll loop: HTTP GET with Range header ----------

let offset = loadOffset();
let carry = '';

async function pollOnce() {
    let res;
    try { res = await fetch(EVENTS_URL, { headers: { Range: `bytes=${offset}-` } }); }
    catch { return; /* cs16 down / DNS failure — retry next tick */ }

    if (res.status === 404) return;  // file not yet created

    if (res.status === 416) {
        // Range past EOF → file was truncated or rotated. Reset.
        console.warn('[sidecar] 416 — resetting offset');
        offset = 0; carry = ''; saveOffset(offset);
        return;
    }

    if (res.status === 200) {
        // Server returned full body (didn't honor Range). Slice from offset.
        const body = await res.text();
        if (body.length <= offset) return;
        const slice = body.slice(offset);
        const combined = carry + slice;
        const lines = combined.split('\n');
        carry = lines.pop() ?? '';
        for (const line of lines) processLine(line);
        offset = body.length - carry.length;
        saveOffset(offset);
        return;
    }

    if (res.status !== 206) {
        console.error('[sidecar] events fetch non-ok:', res.status);
        return;
    }

    const slice = await res.text();
    if (!slice) return;
    const combined = carry + slice;
    const lines = combined.split('\n');
    carry = lines.pop() ?? '';
    for (const line of lines) processLine(line);
    offset += slice.length;
    saveOffset(offset);
}

console.log(`[sidecar] starting — ${EVENTS_URL} (offset ${offset}) → ${WEBHOOK_URL}`);

setInterval(() => { pollOnce().catch(err => console.error('[sidecar] poll error:', err)); }, POLL_MS);

process.on('SIGTERM', () => { saveOffset(offset); persistSeen(seenMatchIds); process.exit(0); });
process.on('SIGINT',  () => { saveOffset(offset); persistSeen(seenMatchIds); process.exit(0); });

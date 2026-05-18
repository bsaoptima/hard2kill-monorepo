#include <amxmodx>
#include <amxmisc>
#include <cstrike>

// H2K Match — CSDM-compatible companion plugin.
//
// Scope:
//   - Reads `setinfo token` + `setinfo matchid` on client_putinserver
//     (set by the React wrapper before connect — see cs/client/src/main.ts)
//   - Tracks kills only for tokenized players (free-play players are ignored)
//   - Detects match end by: kill limit, time limit, forfeit on disconnect
//   - Appends a match_end event to h2k_events.jsonl
//
// Out of scope (CSDM handles):
//   - Team / model selection (engine native menus)
//   - Weapon equip on spawn (csdm_equip)
//   - Random spawn placement (csdm_spawn_preset)
//   - Instant respawn (csdm_main)
//   - Bomb removal (csdm_misc with remove_objectives = abcd)
//
// Players without a token are completely ignored — they just play CSDM TDM
// for free. This makes fps.hard2kill.me a viable casual entry point too.

#define PLUGIN  "H2K Match"
#define VERSION "0.1"
#define AUTHOR  "Hard2Kill"

#define MATCH_TIME_LIMIT 600    // 10 minutes
#define MATCH_KILL_LIMIT 30     // first to 30 kills wins
#define MAX_PLAYERS 32

// Per-slot state (1-32; index 0 unused, matches engine slot numbering)
new g_kills[MAX_PLAYERS+1]
new g_token[MAX_PLAYERS+1][192]
new bool:g_isInMatch[MAX_PLAYERS+1]

// Active match
new g_matchId[64]
new g_matchStartTime
new bool:g_matchActive = false

new const STATE_FILE[]  = "h2k_state.json"      // overwritten every tick
new const EVENTS_FILE[] = "h2k_events.jsonl"    // append-only, sidecar tails

public plugin_init() {
    register_plugin(PLUGIN, VERSION, AUTHOR)
    register_event("DeathMsg", "event_death", "a")

    // Tick once per second to write state file + check time limit
    set_task(1.0, "tick", _, _, _, "b")

    server_print("[H2K Match] v%s loaded (companion to CSDM)", VERSION)
}

// ==================== PLAYER LIFECYCLE ====================

public client_putinserver(id) {
    g_kills[id] = 0
    g_isInMatch[id] = false
    g_token[id][0] = 0

    new tokenBuf[192]
    new matchIdBuf[64]
    get_user_info(id, "token", tokenBuf, charsmax(tokenBuf))
    get_user_info(id, "matchid", matchIdBuf, charsmax(matchIdBuf))

    // No token = free-play user, nothing to track
    if (strlen(tokenBuf) == 0 || strlen(matchIdBuf) == 0) {
        return
    }

    copy(g_token[id], charsmax(g_token[]), tokenBuf)
    g_isInMatch[id] = true

    // First tokenized player arms the match
    if (!g_matchActive) {
        copy(g_matchId, charsmax(g_matchId), matchIdBuf)
        g_matchActive = true
        g_matchStartTime = get_systime()
        server_print("[H2K Match] Match %s armed (player 1 in slot %d)", matchIdBuf, id)
    } else if (equal(g_matchId, matchIdBuf)) {
        server_print("[H2K Match] Match %s player 2 in slot %d", matchIdBuf, id)
    } else {
        // Different matchId arrived during another active match — log and ignore for tracking
        server_print("[H2K Match] WARN: slot %d has matchId %s but %s is active",
            id, matchIdBuf, g_matchId)
        g_isInMatch[id] = false
    }
}

public client_disconnected(id) {
    if (!g_isInMatch[id]) return
    g_isInMatch[id] = false

    if (!g_matchActive) return

    // Tokenized player in active match left — opponent wins by forfeit
    new opponent = find_other_match_player(id)
    if (opponent > 0) {
        end_match(opponent, id, "forfeit")
    } else {
        // No opponent ever connected, or they also left first
        end_match(0, 0, "abandoned")
    }
}

// ==================== KILLS ====================

public event_death() {
    if (!g_matchActive) return

    new killer = read_data(1)
    new victim = read_data(2)
    if (killer <= 0 || victim <= 0 || killer == victim) return
    if (!g_isInMatch[killer]) return

    g_kills[killer]++

    if (g_kills[killer] >= MATCH_KILL_LIMIT) {
        new loser = find_other_match_player(killer)
        end_match(killer, loser, "killlimit")
    }
}

// ==================== TICK ====================

public tick() {
    write_state()

    if (g_matchActive) {
        new elapsed = get_systime() - g_matchStartTime
        if (elapsed >= MATCH_TIME_LIMIT) {
            end_by_time()
        }
    }
}

end_by_time() {
    new p1 = -1, p2 = -1
    for (new i = 1; i <= MAX_PLAYERS; i++) {
        if (!g_isInMatch[i]) continue
        if (p1 == -1) p1 = i
        else if (p2 == -1) p2 = i
    }

    if (p1 > 0 && p2 > 0) {
        if (g_kills[p1] > g_kills[p2])      end_match(p1, p2, "timelimit")
        else if (g_kills[p2] > g_kills[p1]) end_match(p2, p1, "timelimit")
        else                                 end_match(0, 0, "draw")
    } else if (p1 > 0) {
        end_match(p1, 0, "no_opponent")
    } else {
        end_match(0, 0, "abandoned")
    }
}

// ==================== MATCH END ====================

end_match(winner_slot, loser_slot, const reason[]) {
    if (!g_matchActive) return

    server_print("[H2K Match] === END === matchId=%s reason=%s winner_slot=%d loser_slot=%d",
        g_matchId, reason, winner_slot, loser_slot)

    append_match_end_event(winner_slot, loser_slot, reason)

    // Reset everything for next match
    g_matchActive = false
    g_matchId[0] = 0
    for (new i = 1; i <= MAX_PLAYERS; i++) {
        g_kills[i] = 0
        g_isInMatch[i] = false
        g_token[i][0] = 0
    }

    write_state()
}

find_other_match_player(except_id) {
    for (new i = 1; i <= MAX_PLAYERS; i++) {
        if (i == except_id) continue
        if (!g_isInMatch[i]) continue
        return i
    }
    return 0
}

// ==================== FILE I/O ====================

public write_state() {
    new file = fopen(STATE_FILE, "w")
    if (!file) return

    new remaining = MATCH_TIME_LIMIT
    if (g_matchActive) {
        new elapsed = get_systime() - g_matchStartTime
        remaining = MATCH_TIME_LIMIT - elapsed
        if (remaining < 0) remaining = 0
    }

    // Players JSON array
    new playersJson[1024]
    new pos = 0
    pos += formatex(playersJson[pos], charsmax(playersJson) - pos, "[")
    new first = true
    for (new i = 1; i <= MAX_PLAYERS; i++) {
        if (!is_user_connected(i)) continue
        new name[32]
        get_user_name(i, name, charsmax(name))
        if (!first) pos += formatex(playersJson[pos], charsmax(playersJson) - pos, ",")
        first = false
        pos += formatex(playersJson[pos], charsmax(playersJson) - pos,
            "{^"slot^":%d,^"name^":^"%s^",^"kills^":%d,^"inMatch^":%s}",
            i, name, g_kills[i], g_isInMatch[i] ? "true" : "false")
    }
    pos += formatex(playersJson[pos], charsmax(playersJson) - pos, "]")

    fprintf(file, "{^"matchId^":^"%s^",^"active^":%s,^"timeLimit^":%d,^"killLimit^":%d,^"remaining^":%d,^"players^":%s}",
        g_matchId, g_matchActive ? "true" : "false",
        MATCH_TIME_LIMIT, MATCH_KILL_LIMIT, remaining, playersJson)

    fclose(file)
}

// Append a match_end event to h2k_events.jsonl. Sidecar tails this file,
// verifies the embedded token HMACs against CS16_WEBHOOK_SECRET, then POSTs
// to https://hard2kill.com/api/cs16/match-result.
append_match_end_event(winner_slot, loser_slot, const reason[]) {
    new file = fopen(EVENTS_FILE, "a")
    if (!file) {
        server_print("[H2K Match] ERROR: failed to open events file")
        return
    }

    new winner_token[192], loser_token[192]
    new winner_kills = 0, loser_kills = 0
    new winner_name[32], loser_name[32]

    if (winner_slot > 0) {
        copy(winner_token, charsmax(winner_token), g_token[winner_slot])
        winner_kills = g_kills[winner_slot]
        get_user_name(winner_slot, winner_name, charsmax(winner_name))
    }
    if (loser_slot > 0) {
        copy(loser_token, charsmax(loser_token), g_token[loser_slot])
        loser_kills = g_kills[loser_slot]
        get_user_name(loser_slot, loser_name, charsmax(loser_name))
    }

    // One JSON object per line (JSONL). ^" escapes a literal " in Pawn strings.
    fprintf(file, "{^"type^":^"match_end^",^"time^":%d,^"matchId^":^"%s^",^"reason^":^"%s^",^"winner^":{^"slot^":%d,^"name^":^"%s^",^"kills^":%d,^"token^":^"%s^"},^"loser^":{^"slot^":%d,^"name^":^"%s^",^"kills^":%d,^"token^":^"%s^"}}^n",
        get_systime(), g_matchId, reason,
        winner_slot, winner_name, winner_kills, winner_token,
        loser_slot, loser_name, loser_kills, loser_token)

    fclose(file)
    server_print("[H2K Match] match_end appended: matchId=%s reason=%s", g_matchId, reason)
}

import { loadAsync } from 'jszip'
import xashURL from 'xash3d-fwgs/xash.wasm?url'
import gl4esURL from 'xash3d-fwgs/libref_webgl2.wasm?url'
import { Xash3DWebRTC } from './webrtc'

// ===========================================================================
// parseMatchParams() — read wagering match metadata from the URL.
// hard2kill.com's matchmaking redirects winners here as:
//   https://fps.hard2kill.me/?matchId=...&token=...&name=...&opponent=...&connect=...
// We pass token + matchid to the engine via setinfo, and the AMX companion
// plugin (h2k_match.amxx) reads them on client_putinserver to identify the
// player for the wagering sidecar.
// Returns null if any required field is missing — falls through to free-play.
// ===========================================================================
interface MatchParams {
  matchId: string
  token: string
  name: string
  opponent?: string
}

function parseMatchParams(): MatchParams | null {
  const q = new URLSearchParams(window.location.search)
  const matchId = q.get('matchId')
  const token = q.get('token')
  const name = q.get('name')
  if (!matchId || !token || !name) return null
  return {
    matchId,
    token,
    name,
    opponent: q.get('opponent') || undefined,
  }
}

// ===========================================================================
// Types + DOM handles
// ===========================================================================
interface ServerConfig {
  arguments?: string[]
  console?: string[]
  game_dir: string
  libraries: {
    client: string
    server: string
    extras: string
    menu: string
    filesystem: string
  }
  dynamic_libraries: string[]
  files_map: Record<string, string>
}

const splash = document.getElementById('splash') as HTMLDivElement
const progressFill = document.getElementById('progress-fill') as HTMLDivElement
const progressText = document.getElementById('progress-text') as HTMLDivElement
const joinBtn = document.getElementById('join') as HTMLButtonElement
const usernameInput = document.getElementById('username') as HTMLInputElement
const reconnectOverlay = document.getElementById('reconnect-overlay') as HTMLDivElement
const reconnectBtn = document.getElementById('reconnect-btn') as HTMLButtonElement

// ===========================================================================
// Username — persist last-used to localStorage
// ===========================================================================
const storedUsername = localStorage.getItem('username')
if (storedUsername) usernameInput.value = storedUsername
usernameInput.addEventListener('input', () => {
  localStorage.setItem('username', usernameInput.value)
})

// ===========================================================================
// Boot state
// ===========================================================================
let engine: any = null
let engineReady = false
let serverConfig: ServerConfig | null = null
let hasConnected = false
let lastHiddenAt = 0

// ===========================================================================
// Helpers
// ===========================================================================
function formatMB(bytes: number): string {
  return (bytes / 1048576).toFixed(1)
}

function randomName(): string {
  return `Player${Math.floor(Math.random() * 9000 + 1000)}`
}

async function fetchWithProgress(
  url: string,
  onProgress: (received: number, total: number | null) => void,
): Promise<ArrayBuffer> {
  const res = await fetch(url)
  const contentLength = res.headers.get('Content-Length')
  const total = contentLength ? parseInt(contentLength, 10) : null
  const reader = res.body!.getReader()
  const chunks: Uint8Array[] = []
  let received = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    received += value.length
    onProgress(received, total)
  }

  return new Blob(chunks).arrayBuffer()
}

// ===========================================================================
// Boot — runs on page load. Parallel: valve.zip fetch, WASM init, extras fetch.
// Progress bar driven by valve.zip (dominant size). Finishes with JOIN enabled.
// ===========================================================================
async function boot() {
  try {
    serverConfig = (await fetch('/config').then((r) => r.json())) as ServerConfig

    engine = new Xash3DWebRTC({
      canvas: document.getElementById('canvas') as HTMLCanvasElement,
      arguments: serverConfig.arguments || ['-windowed'],
      libraries: {
        filesystem: serverConfig.libraries.filesystem,
        xash: xashURL,
        menu: serverConfig.libraries.menu,
        server: serverConfig.libraries.server,
        client: serverConfig.libraries.client,
        render: { gl4es: gl4esURL },
      },
      dynamicLibraries: serverConfig.dynamic_libraries,
      filesMap: serverConfig.files_map,
    })
    ;(window as any).engine = engine

    progressText.textContent = 'Downloading…'

    const [zipBuffer, extrasBuffer] = await Promise.all([
      fetchWithProgress('valve.zip', (received, total) => {
        if (total) {
          const pct = Math.floor((received / total) * 100)
          progressFill.style.width = `${pct}%`
          progressText.textContent = `${formatMB(received)} / ${formatMB(total)} MB`
        } else {
          progressText.textContent = `${formatMB(received)} MB`
        }
      }),
      fetch(serverConfig.libraries.extras).then((r) => r.arrayBuffer()),
      engine.init(),
    ])

    progressText.textContent = 'Unpacking…'
    const zip = await loadAsync(zipBuffer)

    await Promise.all(
      Object.entries(zip.files).map(async ([filename, file]: any) => {
        if (file.dir) return
        const path = '/rodir/' + filename
        const dir = path.split('/').slice(0, -1).join('/')
        engine.em.FS.mkdirTree(dir)
        engine.em.FS.writeFile(path, await file.async('uint8array'))
      }),
    )
    engine.em.FS.writeFile(
      `/rodir/${serverConfig.game_dir}/extras.pk3`,
      new Uint8Array(extrasBuffer),
    )
    engine.em.FS.chdir('/rodir')

    engineReady = true
    progressFill.style.width = '100%'
    progressText.textContent = 'Ready'
    joinBtn.disabled = false
    joinBtn.textContent = 'Join Match'

    // If the user got redirected here from hard2kill.com matchmaking, auto-fill
    // the name + auto-click JOIN so they don't have to confirm anything. They
    // already committed money on the previous page; one more click is friction.
    const matchParams = parseMatchParams()
    if (matchParams) {
      usernameInput.value = matchParams.name
      progressText.textContent = matchParams.opponent
        ? `Match found: ${matchParams.name} vs ${matchParams.opponent}`
        : 'Match found — launching…'
      // Tiny delay so the user sees the "Ready" → "Match found" transition
      // rather than a flash. Prevents a "did anything happen?" feeling.
      setTimeout(() => joinBtn.click(), 400)
    }
  } catch (err) {
    console.error('[boot] failed:', err)
    progressText.textContent = 'Load failed — refresh the page'
    progressText.style.color = '#ff2e2e'
  }
}

// ===========================================================================
// JOIN click — kick off engine main loop + connect to server
// ===========================================================================
joinBtn.addEventListener('click', () => {
  if (!engineReady || !engine || !serverConfig) return
  joinBtn.disabled = true

  const username = (usernameInput.value.trim() || randomName()).slice(0, 32)
  localStorage.setItem('username', username)

  // Match the exact order of the pre-Phase-1 working code: main(), then
  // name, then any server console commands, then connect — all synchronous
  // on the same tick. Delays were hurting, not helping.
  console.log('[join] engine.main()')
  engine.main()
  engine.Cmd_ExecuteString(`name "${username}"`)

  if (Array.isArray(serverConfig.console)) {
    for (const cmd of serverConfig.console) {
      console.log('[join] server cmd:', cmd)
      engine.Cmd_ExecuteString(cmd)
    }
  }

  // Phase 5+ wagering hook — today returns null, no-ops.
  const matchParams = parseMatchParams()
  if (matchParams) {
    engine.Cmd_ExecuteString(`setinfo token "${matchParams.token}"`)
    engine.Cmd_ExecuteString(`setinfo matchid "${matchParams.matchId}"`)
  }

  console.log('[join] connect 127.0.0.1:8080')
  engine.Cmd_ExecuteString('connect 127.0.0.1:8080')
  hasConnected = true

  // Hide splash after the engine is rendering. We wait ~500 ms + 1 rAF so the
  // first rendered frame is up — prevents a black-canvas flash.
  const startedAt = performance.now()
  function hideWhenRendered() {
    if (performance.now() - startedAt < 500) {
      requestAnimationFrame(hideWhenRendered)
      return
    }
    splash.classList.add('hidden')
  }
  requestAnimationFrame(hideWhenRendered)
})

// ===========================================================================
// Page Visibility API — soften the "tab backgrounded → WebRTC dropped →
// engine falls back to GoldSrc main menu" behaviour. We can't reach into the
// engine to detect disconnect cleanly, so: if the tab was hidden long enough
// that sv_timeout likely kicked us, offer a Reconnect button when it returns.
// ===========================================================================
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    lastHiddenAt = performance.now()
  } else if (hasConnected) {
    const hiddenMs = performance.now() - lastHiddenAt
    // sv_timeout is 600s on the server; browsers typically throttle enough
    // that WebRTC misses keepalives after 1-2 min. Offer reconnect after 90s.
    if (hiddenMs > 90_000) {
      reconnectOverlay.classList.add('visible')
    }
  }
})

reconnectBtn.addEventListener('click', () => {
  reconnectOverlay.classList.remove('visible')
  if (engine) {
    // Safe: if engine is already connected, `connect` is a disconnect+reconnect.
    // If it dropped to main menu, this takes us back into the match.
    engine.Cmd_ExecuteString('connect 127.0.0.1:8080')
  }
})

// Guard against accidental tab close mid-match.
window.addEventListener('beforeunload', (event) => {
  if (hasConnected) {
    event.preventDefault()
    event.returnValue = ''
    return ''
  }
})

boot()

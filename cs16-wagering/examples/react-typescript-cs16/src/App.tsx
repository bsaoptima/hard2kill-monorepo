import React, {FC, useRef, useState, useCallback} from 'react';
import {Xash3D} from "xash3d-fwgs";
import filesystemURL from 'xash3d-fwgs/filesystem_stdio.wasm'
import xashURL from 'xash3d-fwgs/xash.wasm'
import menuURL from 'cs16-client/cl_dll/menu_emscripten_wasm32.wasm'
import clientURL from 'cs16-client/cl_dll/client_emscripten_wasm32.wasm'
import serverURL from 'cs16-client/dlls/cs_emscripten_wasm32.wasm'
import gles3URL from 'xash3d-fwgs/libref_gles3compat.wasm'
import {loadAsync} from 'jszip'
import './App.css';

const App: FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const engineRef = useRef<Xash3D | null>(null)
    const [status, setStatus] = useState('Click Start to load CS 1.6')
    const [loading, setLoading] = useState(false)
    const [gameReady, setGameReady] = useState(false)

    const runCommand = useCallback((cmd: string) => {
        if (engineRef.current) {
            engineRef.current.Cmd_ExecuteString(cmd)
            console.log('[H2K] Command:', cmd)
        }
    }, [])

    const handleStart = async () => {
        try {
            setLoading(true)
            setStatus('Initializing engine...')
            console.log('[H2K] Creating Xash3D instance...')

            const x = new Xash3D({
                canvas: canvasRef.current!,
                arguments: ['-windowed', '-game', 'cstrike'],
                libraries: {
                    filesystem: filesystemURL,
                    xash: xashURL,
                    menu: menuURL,
                    server: serverURL,
                    client: clientURL,
                    render: {
                        gles3compat: gles3URL,
                    }
                },
                dynamicLibraries: ['dlls/cs_emscripten_wasm32.wasm', '/rodir/filesystem_stdio.wasm'],
                filesMap: {
                    'dlls/cs_emscripten_wasm32.wasm': serverURL,
                    '/rodir/filesystem_stdio.wasm': filesystemURL,
                },
            });

            setStatus('Downloading game assets (415MB)... This may take a minute.')
            console.log('[H2K] Fetching valve.zip...')

            const [zip] = await Promise.all([
                (async () => {
                    const res = await fetch('valve.zip')
                    console.log('[H2K] valve.zip fetched, status:', res.status)
                    if (!res.ok) throw new Error(`Failed to fetch valve.zip: ${res.status}`)
                    const buf = await res.arrayBuffer()
                    console.log('[H2K] valve.zip loaded, size:', (buf.byteLength / 1024 / 1024).toFixed(1), 'MB')
                    setStatus('Unzipping game assets...')
                    return await loadAsync(buf);
                })(),
                (async () => {
                    console.log('[H2K] Initializing WASM engine...')
                    await x.init()
                    console.log('[H2K] Engine initialized')
                })(),
            ])

            if (x.exited) {
                setStatus('Engine exited unexpectedly. Check console for errors.')
                console.error('[H2K] Engine exited during init')
                return
            }

            setStatus('Writing files to virtual filesystem...')
            console.log('[H2K] Writing', Object.keys(zip.files).length, 'files to VFS...')

            await Promise.all(Object.entries(zip.files).map(async ([filename, file]) => {
                if (file.dir) return;

                const path = '/rodir/' + filename;
                const dir = path.split('/').slice(0, -1).join('/');

                x.em.FS.mkdirTree(dir);
                x.em.FS.writeFile(path, await file.async("uint8array"));
            }))

            console.log('[H2K] All files written. Starting engine...')
            setStatus('Starting CS 1.6...')

            x.em.FS.chdir('/rodir')
            x.main()
            x.Cmd_ExecuteString('_vgui_menus 0')
            engineRef.current = x

            setStatus('')
            setLoading(false)
            setGameReady(true)
            console.log('[H2K] Engine started successfully!')
        } catch (err: any) {
            console.error('[H2K] Error:', err)
            setStatus('Error: ' + err.message)
            setLoading(false)
        }
    }

    return (
        <>
            {status && (
                <div style={{
                    position: 'fixed',
                    top: 20,
                    left: 20,
                    zIndex: 1000,
                    background: 'rgba(0,0,0,0.8)',
                    color: '#0f0',
                    padding: '12px 20px',
                    fontFamily: 'monospace',
                    fontSize: 14,
                    borderRadius: 4,
                }}>
                    {loading && '⏳ '}{status}
                </div>
            )}
            {!loading && status && (
                <button
                    onClick={handleStart}
                    style={{
                        position: 'fixed',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        zIndex: 1000,
                        padding: '20px 40px',
                        fontSize: 24,
                        fontFamily: 'monospace',
                        background: '#0f0',
                        color: '#000',
                        border: 'none',
                        borderRadius: 8,
                        cursor: 'pointer',
                    }}
                >
                    START CS 1.6
                </button>
            )}
            {gameReady && (
                <div style={{
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 999,
                    pointerEvents: 'none',
                }}>
                    <svg width="24" height="24" viewBox="0 0 24 24">
                        <line x1="12" y1="4" x2="12" y2="10" stroke="#0f0" strokeWidth="2"/>
                        <line x1="12" y1="14" x2="12" y2="20" stroke="#0f0" strokeWidth="2"/>
                        <line x1="4" y1="12" x2="10" y2="12" stroke="#0f0" strokeWidth="2"/>
                        <line x1="14" y1="12" x2="20" y2="12" stroke="#0f0" strokeWidth="2"/>
                    </svg>
                </div>
            )}
            {gameReady && (
                <div style={{
                    position: 'fixed',
                    bottom: 20,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 1000,
                    display: 'flex',
                    gap: 8,
                }}>
                    {['de_dust2', 'de_inferno', 'de_nuke', 'cs_office', 'de_aztec'].map(map => (
                        <button
                            key={map}
                            onClick={() => runCommand(`map ${map}`)}
                            style={{
                                padding: '10px 16px',
                                fontSize: 14,
                                fontFamily: 'monospace',
                                background: '#0f0',
                                color: '#000',
                                border: 'none',
                                borderRadius: 4,
                                cursor: 'pointer',
                                fontWeight: 'bold',
                            }}
                        >
                            {map}
                        </button>
                    ))}
                    <button
                        onClick={() => {
                            runCommand('bot_add_ct');
                            runCommand('bot_add_ct');
                            runCommand('bot_add_t');
                            runCommand('bot_add_t');
                        }}
                        style={{
                            padding: '10px 16px',
                            fontSize: 14,
                            fontFamily: 'monospace',
                            background: '#ff0',
                            color: '#000',
                            border: 'none',
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontWeight: 'bold',
                        }}
                    >
                        +4 BOTS
                    </button>
                    <button
                        onClick={() => {
                            runCommand('sv_cheats 1');
                            runCommand('bot_quota 4');
                            runCommand('bot_add');
                            runCommand('bot_add');
                            runCommand('bot_add');
                            runCommand('bot_add');
                        }}
                        style={{
                            padding: '10px 16px',
                            fontSize: 14,
                            fontFamily: 'monospace',
                            background: '#f80',
                            color: '#000',
                            border: 'none',
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontWeight: 'bold',
                        }}
                    >
                        FORCE BOTS
                    </button>
                </div>
            )}
            <canvas id="canvas" ref={canvasRef} style={{
                width: '100vw',
                height: '100vh',
                position: 'fixed',
                top: 0,
                left: 0,
                background: '#000',
            }}/>
        </>
    );
}

export default App;

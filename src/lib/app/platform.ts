export const isTauri = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

/**
 * The WebSocket of the Node UDP bridge, or null when nothing serves one.
 * The Node bridge rides on the Vite dev and preview servers, so it exists exactly when one of them served the page.
 * A packaged Tauri app is served from `tauri://localhost` (`http://tauri.localhost` on Windows), where nothing listens.
 */
export function bridgeUrl(page: Pick<Location, 'protocol' | 'host' | 'hostname'> = location): string | null {
  if (!/^https?:$/.test(page.protocol) || page.hostname === 'tauri.localhost') return null
  return `${page.protocol === 'https:' ? 'wss' : 'ws'}://${page.host}/bridge`
}

export type BridgeEndpoint = { kind: 'tauri' } | { kind: 'websocket'; url: string }

/** Under Tauri always the Rust bridge, in `tauri dev` too, so development streams through what ships. */
export function bridgeEndpoint(tauri = isTauri(), page: Pick<Location, 'protocol' | 'host' | 'hostname'> = location): BridgeEndpoint | null {
  if (tauri) return { kind: 'tauri' }
  const url = bridgeUrl(page)
  return url ? { kind: 'websocket', url } : null
}

export const isMac = () => typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

import { expect, it } from 'vitest'
import { bridgeEndpoint, bridgeUrl } from './platform'

const page = (href: string) => new URL(href)

it('the bridge is the /bridge socket of the dev or preview server that served the page', () => {
  expect(bridgeUrl(page('http://localhost:5173/graph'))).toBe('ws://localhost:5173/bridge')
  expect(bridgeUrl(page('http://localhost:1420/'))).toBe('ws://localhost:1420/bridge')
  expect(bridgeUrl(page('https://192.168.1.20:4173/'))).toBe('wss://192.168.1.20:4173/bridge')
})

it('a packaged Tauri app has no Node bridge on any platform', () => {
  expect(bridgeUrl(page('tauri://localhost/'))).toBeNull()
  expect(bridgeUrl(page('http://tauri.localhost/'))).toBeNull()
  expect(bridgeUrl(page('https://tauri.localhost/graph'))).toBeNull()
})

it('under Tauri the Rust bridge is the endpoint, in tauri dev too, where the Node bridge also exists', () => {
  expect(bridgeEndpoint(true, page('tauri://localhost/'))).toEqual({ kind: 'tauri' })
  expect(bridgeEndpoint(true, page('http://localhost:1420/'))).toEqual({ kind: 'tauri' })
})

it('a browser gets the WebSocket of its server, and a page nothing serves a bridge for gets none', () => {
  expect(bridgeEndpoint(false, page('http://localhost:5173/graph'))).toEqual({ kind: 'websocket', url: 'ws://localhost:5173/bridge' })
  expect(bridgeEndpoint(false, page('file:///index.html'))).toBeNull()
})

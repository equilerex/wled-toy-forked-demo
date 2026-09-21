import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import ui from '@nuxt/ui/vite'
import { attachBridge } from './bridge.ts'

const udpBridge = (): Plugin => ({
  name: 'wled-udp-bridge',
  configureServer(server) {
    if (server.httpServer) attachBridge(server.httpServer)
  },
  configurePreviewServer(server) {
    attachBridge(server.httpServer)
  },
})

// the Tauri CLI sets these for its beforeDevCommand; a plain `npm run dev` keeps Vite's defaults
const tauriDev = process.env.TAURI_ENV_PLATFORM !== undefined
const tauriDevHost = process.env.TAURI_DEV_HOST

export default defineConfig({
  clearScreen: false,
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  envPrefix: ['VITE_', 'TAURI_ENV_'],
  server: {
    // src-tauri/tauri.conf.json's devUrl points here, away from 5173 so a browser dev server can run alongside
    ...(tauriDev ? { port: 1420, strictPort: true } : {}),
    ...(tauriDevHost ? { host: tauriDevHost, hmr: { protocol: 'ws', host: tauriDevHost, port: 1421 } } : {}),
    watch: { ignored: ['**/src-tauri/**'] },
  },
  build: {
    // as a data: URL the audio worklet would need `script-src data:` in the desktop app's CSP
    assetsInlineLimit: (file) => (file.endsWith('hop-processor.js') ? false : undefined),
  },
  plugins: [
    vue(),
    ui({
      ui: {
        colors: { primary: 'ember', neutral: 'taupe' },
        button: { slots: { base: 'font-semibold tracking-tight' } },
        badge: { slots: { base: 'rounded-full font-medium' } },
        modal: { slots: { content: 'ring-primary/25' } },
      },
      // bundle the lucide icons referenced in templates so the app works offline on the LAN
      icon: { clientBundle: { scan: true } },
    }),
    udpBridge(),
  ],
})

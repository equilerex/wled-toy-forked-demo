import { afterEach, expect, it, vi } from 'vitest'
import { createApp, h, nextTick, type Component } from 'vue'
import InputsInspector from './InputsInspector.vue'
import OutputInspector from './OutputInspector.vue'
import { registerHandlers } from '@/lib/app/commands'
import { config } from '@/lib/app/config'
import { activeDevice, addDevice, removeDevice, setActiveDevice } from '@/lib/app/devices'
import { settingsView } from '@/lib/app/preferences'
import { useEngine } from '@/lib/engine/engine'

const initial = { brightness: config.brightness, scanY: config.scanY, fps: config.fps, protocol: config.protocol, universe: config.universe, layout: config.layout }

let unmount: (() => void) | undefined
afterEach(async () => {
  unmount?.()
  Object.assign(config, initial)
  useEngine().audio.state.error = null
  await useEngine().useImage(null, false)
  await useEngine().useSong(null, false)
})

function mount(component: Component) {
  const root = document.createElement('div')
  document.body.append(root)
  const app = createApp({ render: () => h(component) })
  app.mount(root)
  unmount = () => { app.unmount(); root.remove() }
  return root
}

function enter(root: HTMLElement, control: string, value: string, event: 'input' | 'change') {
  const el = root.querySelector<HTMLInputElement | HTMLSelectElement>(`[data-control="${control}"]`)!
  el.value = value
  el.dispatchEvent(new Event(event, { bubbles: true }))
  return el
}

it('brightness and scan row write the config while the slider moves', async () => {
  const root = mount(OutputInspector)
  enter(root, 'brightness', '0.35', 'input')
  expect(config.brightness).toBe(0.35)
  enter(root, 'scanY', '0.8', 'input')
  expect(config.scanY).toBe(0.8)
  await nextTick()
  expect(root.textContent).toContain('35%')
  expect(root.textContent).toContain('0.80')
})

it('the scan row is not offered while a layout places the LEDs', async () => {
  const root = mount(OutputInspector)
  config.layout = { segments: [{ kind: 'matrix', width: 4, height: 4, origin: 'top-left', serpentine: false }] } as typeof config.layout
  await nextTick()
  expect(root.querySelector('[data-control="scanY"]')).toBeNull()
  expect(root.textContent).toContain('matrix 4x4')
})

it('the target rate and the protocol apply on change, and a rate out of range is clamped in the field too', async () => {
  const root = mount(OutputInspector)
  enter(root, 'fps', '45', 'change')
  expect(config.fps).toBe(45)
  const field = enter(root, 'fps', '500', 'change')
  expect(config.fps).toBe(120)
  expect(field.value).toBe('120')
  enter(root, 'fps', '', 'change')
  expect(config.fps).toBe(120)

  expect(root.querySelector('[data-control="universe"]')).toBeNull()
  enter(root, 'protocol', 'artnet', 'change')
  expect(config.protocol).toBe('artnet')
  await nextTick()
  enter(root, 'universe', '3', 'change')
  expect(config.universe).toBe(3)
})

it('switching the device in the inspector makes it the active device', async () => {
  const first = activeDevice.value.id
  const second = addDevice('Second strip')
  setActiveDevice(first)
  const root = mount(OutputInspector)
  await nextTick()
  try {
    expect(root.querySelector<HTMLSelectElement>('[data-control="device"]')!.value).toBe(first)
    enter(root, 'device', second.id, 'change')
    expect(activeDevice.value.id).toBe(second.id)
  } finally {
    setActiveDevice(first)
    removeDevice(second.id)
  }
})

it('shows the audio error, which nothing else in the window does', async () => {
  const root = mount(InputsInspector)
  expect(root.querySelector('.audio-error')).toBeNull()
  useEngine().audio.state.error = 'Permission to capture audio was refused'
  await nextTick()
  expect(root.querySelector('.audio-error')!.textContent).toBe('Permission to capture audio was refused')
})

it('names the song and the image in use, and Use built-in goes back to the built-in ones', async () => {
  const engine = useEngine()
  await engine.useSong({ blob: new Blob(['x']), name: 'mine.mp3' }, false)
  await engine.useImage({ blob: new Blob(['x']), name: 'mine.png' }, false)
  const root = mount(InputsInspector)
  const shown = () => [root.querySelector('[data-value="track"]')!.textContent, root.querySelector('[data-value="image"]')!.textContent]
  expect(shown()).toEqual(['mine.mp3', 'mine.png'])

  root.querySelector<HTMLElement>('[data-action="audio.builtIn"]')!.click()
  root.querySelector<HTMLElement>('[data-action="image.builtIn"]')!.click()
  await vi.waitFor(() => expect(shown()).toEqual(['Built-in track', 'Built-in image']))
})

it('Choose... runs the registry commands instead of owning a file input', () => {
  const chooseSong = vi.fn()
  const chooseImage = vi.fn()
  const release = registerHandlers({ 'audio.fromFile': chooseSong, 'image.fromFile': chooseImage })
  const root = mount(InputsInspector)
  try {
    root.querySelector<HTMLElement>('[data-action="audio.fromFile"]')!.click()
    root.querySelector<HTMLElement>('[data-action="image.fromFile"]')!.click()
    expect([chooseSong.mock.calls.length, chooseImage.mock.calls.length]).toEqual([1, 1])
    expect(root.querySelector('input[type="file"]')).toBeNull()
  } finally {
    release()
  }
})

it('the macOS desktop app cannot capture system audio: the choice is disabled and says what to do instead', async () => {
  Object.defineProperty(navigator, 'platform', { value: 'MacIntel', configurable: true })
  ;(window as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ = {}
  try {
    const root = mount(InputsInspector)
    const system = root.querySelector<HTMLButtonElement>('[data-source="loopback"]')!
    expect(system.disabled).toBe(true)
    expect(system.title).toContain('BlackHole')
    expect(root.querySelector('.system-audio-note')!.textContent).toContain('not available in the desktop app yet')
    expect(root.querySelector<HTMLButtonElement>('[data-source="device"]')!.disabled).toBe(false)
  } finally {
    delete (window as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__
    delete (navigator as { platform?: string }).platform
  }
  unmount?.()
  const root = mount(InputsInspector)
  expect(root.querySelector<HTMLButtonElement>('[data-source="loopback"]')!.disabled).toBe(false)
  expect(root.querySelector('.system-audio-note')).toBeNull()
})

it('missing MIDI is worded for where the app runs', async () => {
  const midi = useEngine().midi.state
  const available = midi.available
  midi.available = false
  try {
    expect(mount(InputsInspector).querySelector('.midi-unavailable')!.textContent).toBe('This browser has no Web MIDI.')
    unmount?.()
    ;(window as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ = {}
    expect(mount(InputsInspector).querySelector('.midi-unavailable')!.textContent).toBe('MIDI is not available in the desktop app yet.')
  } finally {
    delete (window as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__
    midi.available = available
  }
})

it('Edit... next to the LED layout opens the preferences on Devices, where the layout is edited', () => {
  settingsView.open = false
  settingsView.section = 'general'
  const root = mount(OutputInspector)
  const edit = [...root.querySelectorAll('button')].find((b) => b.textContent!.trim() === 'Edit...')!
  edit.click()
  expect(settingsView.open).toBe(true)
  expect(settingsView.section).toBe('devices')
  settingsView.open = false
})

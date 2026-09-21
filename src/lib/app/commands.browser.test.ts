import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { installKeyDispatcher, isMac, markNativeMenuInstalled, palette, registerHandlers } from './commands'
import { resetLayout, workspace } from './workspace'

const cleanups: Array<() => void> = []
beforeEach(() => cleanups.push(installKeyDispatcher()))
afterEach(() => {
  cleanups.splice(0).forEach((cleanup) => cleanup())
  palette.open = false
  resetLayout()
  workspace.mode = 'shader'
})

function press(target: EventTarget, key: string, init: KeyboardEventInit & { mod?: boolean } = {}) {
  const { mod, ...rest } = init
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...(mod ? (isMac() ? { metaKey: true } : { ctrlKey: true }) : {}), ...rest })
  target.dispatchEvent(event)
  return event
}

function attach<T extends HTMLElement>(el: T): T {
  document.body.append(el)
  cleanups.push(() => el.remove())
  return el
}

function bind(id: string) {
  const handler = vi.fn()
  cleanups.push(registerHandlers({ [id]: handler }))
  return handler
}

it('Cmd/Ctrl+B and Cmd/Ctrl+J toggle the docks and take the key from the browser', () => {
  expect(press(document.body, 'b', { mod: true }).defaultPrevented).toBe(true)
  expect(press(document.body, 'j', { mod: true }).defaultPrevented).toBe(true)
  expect([workspace.dockVisible, workspace.bottomVisible]).toEqual([false, true])
})

it('under a native menu the keys its items bind are left to them, so no command runs twice; other keys still dispatch', () => {
  markNativeMenuInstalled()
  cleanups.push(() => markNativeMenuInstalled(false))
  expect(press(document.body, 'b', { mod: true }).defaultPrevented).toBe(false)
  expect(workspace.dockVisible).toBe(true)
  // an alias has no native item, and neither has a key without Cmd/Ctrl
  expect(press(document.body, 'P', { mod: true, shiftKey: true }).defaultPrevented).toBe(true)
  expect(palette.open).toBe(true)
  palette.open = false
  workspace.mode = 'graph'
  const fit = bind('graph.fitView')
  press(document.body, 'Home')
  expect(fit).toHaveBeenCalledTimes(1)
})

it('the platform\'s other modifier is not Mod', () => {
  const event = press(document.body, 'b', isMac() ? { ctrlKey: true } : { metaKey: true })
  expect(event.defaultPrevented).toBe(false)
  expect(workspace.dockVisible).toBe(true)
})

it('a key somebody handled already is left alone', () => {
  const claim = (e: Event) => e.preventDefault()
  document.addEventListener('keydown', claim)
  cleanups.push(() => document.removeEventListener('keydown', claim))
  press(document.body, 'b', { mod: true })
  expect(workspace.dockVisible).toBe(true)
})

it('a held key does not fire again', () => {
  press(document.body, 'b', { mod: true, repeat: true })
  expect(workspace.dockVisible).toBe(true)
})

it('an accelerator without Cmd/Ctrl stays out of text fields and the code editor', () => {
  workspace.mode = 'graph'
  const fit = bind('graph.fitView')
  const editor = attach(document.createElement('div'))
  editor.className = 'cm-editor'
  const line = editor.appendChild(document.createElement('div'))
  const editable = attach(document.createElement('div'))
  editable.setAttribute('contenteditable', 'true')
  for (const target of [attach(document.createElement('input')), attach(document.createElement('textarea')), editable, line]) {
    expect(press(target, 'Home').defaultPrevented, target.tagName).toBe(false)
  }
  expect(fit).not.toHaveBeenCalled()
  expect(press(attach(document.createElement('button')), 'Home').defaultPrevented).toBe(true)
  expect(fit).toHaveBeenCalledOnce()
})

it('an accelerator with Cmd/Ctrl works from inside a text field', () => {
  press(attach(document.createElement('input')), 'b', { mod: true })
  expect(workspace.dockVisible).toBe(false)
})

it('nothing fires under a dialog, and the key stays with the dialog', () => {
  attach(document.createElement('div')).setAttribute('role', 'dialog')
  expect(press(document.body, 'b', { mod: true }).defaultPrevented).toBe(false)
  expect(workspace.dockVisible).toBe(true)
})

it('a command of another mode does not answer its key', () => {
  const fit = bind('graph.fitView')
  expect(press(document.body, 'Home').defaultPrevented).toBe(false)
  expect(fit).not.toHaveBeenCalled()
})

it('a display-only command is never dispatched, even with a handler bound', () => {
  const compile = bind('shader.compile')
  expect(press(document.body, 'Enter', { mod: true }).defaultPrevented).toBe(false)
  expect(compile).not.toHaveBeenCalled()
})

it('a disabled command keeps its key away from the browser and runs nothing', () => {
  expect(press(document.body, 's', { mod: true }).defaultPrevented).toBe(true)
})

it('Cmd/Ctrl+K and its alias open the palette; Cmd/Ctrl+Alt+K opens it as the shortcut list', () => {
  press(document.body, 'k', { mod: true })
  expect([palette.open, palette.view]).toEqual([true, 'commands'])
  palette.open = false
  press(document.body, 'P', { mod: true, shiftKey: true })
  expect(palette.open).toBe(true)
  palette.open = false
  press(document.body, '˚', { code: 'KeyK', mod: true, altKey: true })
  expect([palette.open, palette.view]).toEqual([true, 'shortcuts'])
})

it('Shift+digit accelerators match by the physical key', () => {
  workspace.bottomVisible = false
  press(document.body, 'M', { mod: true, shiftKey: true })
  expect(workspace.bottomVisible).toBe(true)
  const reset = press(document.body, ')', { code: 'Digit0', mod: true, altKey: true })
  expect(reset.defaultPrevented).toBe(true)
  expect(workspace.bottomVisible).toBe(false)
})

import { describe, expect, it } from 'vitest'
import { createHistory } from './history'

describe('createHistory', () => {
  it('walks back and forward through what was recorded', () => {
    const history = createHistory('a')
    history.record('b')
    history.record('c')
    expect(history.undo()).toBe('b')
    expect(history.undo()).toBe('a')
    expect(history.undo()).toBeNull()
    expect(history.canUndo.value).toBe(false)
    expect(history.redo()).toBe('b')
    expect(history.redo()).toBe('c')
    expect(history.redo()).toBeNull()
  })

  it('ignores an unchanged document, and a new change after an undo drops what could be redone', () => {
    const history = createHistory('a')
    history.record('a')
    expect(history.canUndo.value).toBe(false)
    history.record('b')
    history.undo()
    history.record('z')
    expect(history.canRedo.value).toBe(false)
    expect(history.undo()).toBe('a')
  })

  it('forgets the oldest steps past its limit, and everything on reset', () => {
    const history = createHistory('0', 2)
    for (const text of ['1', '2', '3']) history.record(text)
    expect([history.undo(), history.undo(), history.undo()]).toEqual(['2', '1', null])
    history.reset('x')
    expect(history.canUndo.value || history.canRedo.value).toBe(false)
  })
})

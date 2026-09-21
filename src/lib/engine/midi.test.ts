import { describe, expect, it, vi } from 'vitest'

vi.stubGlobal('navigator', {})
const { MidiService, parseMidi } = await import('./midi')

describe('parseMidi', () => {
  it('reads controllers and notes with their channel', () => {
    expect(parseMidi(Uint8Array.of(0xb0, 74, 64))).toEqual({ kind: 'cc', channel: 1, number: 74, value: 64 / 127 })
    expect(parseMidi(Uint8Array.of(0x95, 60, 127))).toEqual({ kind: 'note', channel: 6, number: 60, value: 1 })
  })

  it('treats note-off and note-on with velocity 0 alike, and ignores the rest', () => {
    expect(parseMidi(Uint8Array.of(0x80, 60, 40))?.value).toBe(0)
    expect(parseMidi(Uint8Array.of(0x90, 60, 0))?.value).toBe(0)
    expect(parseMidi(Uint8Array.of(0xe0, 0, 64))).toBeNull()
    expect(parseMidi(Uint8Array.of(0xf8))).toBeNull()
  })
})

describe('MidiService', () => {
  it('keeps the latest value per channel and for "any channel", and tells listeners', () => {
    const midi = new MidiService()
    const seen: number[] = []
    const stop = midi.onMessage((m) => seen.push(m.number))
    midi.receive(Uint8Array.of(0xb2, 74, 64))
    expect(midi.value('cc', 3, 74)).toBeCloseTo(0.504, 3)
    expect(midi.value('cc', 0, 74)).toBeCloseTo(0.504, 3)
    expect(midi.value('cc', 1, 74)).toBe(0)
    stop()
    midi.receive(Uint8Array.of(0xb2, 75, 1))
    expect(seen).toEqual([74])
  })

  it('reports that Web MIDI is missing instead of throwing', async () => {
    const midi = new MidiService()
    expect(midi.state.available).toBe(false)
    await midi.enable()
    expect(midi.state.enabled).toBe(false)
  })
})

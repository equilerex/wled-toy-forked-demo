import { describe, expect, it } from 'vitest'
import { graph, node, renderGraph } from '@/lib/graph/testing'

const reds = (values: object, leds = 8) =>
  renderGraph(graph([node('uv', 'uv'), node('m', 'mapping', values as never), node('s', 'separateXYZ'), node('o', 'output')], [['uv.uv', 'm.vector'], ['m.vector', 's.vector'], ['s.x', 'o.color']]), { leds }).leds.map(([r]) => r)

const x = (i: number, n = 8) => Math.round(((i + 0.5) / n) * 255)

describe('Mapping', () => {
  it('leaves coordinates alone at rest', () => {
    expect(reds({})).toEqual([...Array(8).keys()].map((i) => x(i)))
  })

  it('moves by Location, scales around the pivot, and turns by Rotation', () => {
    expect(reds({ location: [0.25, 0, 0] }).slice(0, 4)).toEqual([0, 1, 2, 3].map((i) => Math.round(((i + 0.5) / 8 + 0.25) * 255)))
    expect(reds({ scale: [2, 1, 1] })).toEqual([...Array(8).keys()].map((i) => Math.round(Math.min(1, Math.max(0, ((i + 0.5) / 8 - 0.5) * 2 + 0.5)) * 255)))
    // half a turn around the center mirrors the strip
    expect(reds({ rotation: 0.5 })).toEqual([...Array(8).keys()].map((i) => x(7 - i)))
  })

  it('Range Select is 1 between its bounds', () => {
    const { leds } = renderGraph(graph([node('r', 'rangeSelect', { from: 0.25, to: 0.5 }), node('o', 'output')], [['r.mask', 'o.color']]))
    expect(leds.map(([r]) => r)).toEqual([0, 0, 255, 255, 0, 0, 0, 0])
  })

  it('Mix blends and switches, on both sides', () => {
    const one = (values: object) => renderGraph(graph([node('m', 'mix', values as never), node('o', 'output')], [['m.result', 'o.color']]), { leds: 1 }).leds[0][0]
    expect(one({ factor: 0.25, a: 0, b: 1 })).toBe(64)
    expect(one({ mode: 'switch', factor: 0.4, a: 0, b: 1 })).toBe(0)
    expect(one({ mode: 'switch', factor: 0.6, a: 0, b: 1 })).toBe(255)
    expect(one({ factor: 2, a: 0, b: 1, clampFactor: false })).toBe(255)
  })

  it('Hue/Saturation/Value and Separate/Combine Color agree with each other', () => {
    const { leds } = renderGraph(graph(
      [node('c', 'color', { color: [1, 0, 0] }), node('h', 'hueSaturation', { hue: 1 / 3 }), node('s', 'separateColor', { mode: 'hsv' }), node('k', 'combineColor', { mode: 'hsv' }), node('o', 'output')],
      [['c.color', 'h.color'], ['h.color', 's.color'], ['s.a', 'k.a'], ['s.b', 'k.b'], ['s.c', 'k.c'], ['k.color', 'o.color']],
    ), { leds: 1 })
    expect(leds[0]).toEqual([0, 255, 0])
  })
})

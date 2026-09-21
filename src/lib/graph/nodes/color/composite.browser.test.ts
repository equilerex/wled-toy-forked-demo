import { describe, expect, it } from 'vitest'
import { graph, node, renderGraph } from '@/lib/graph/testing'

const one = (kind: string, output: string, values: object, leds = 1) =>
  renderGraph(graph([node('n', kind, values as never), node('o', 'output')], [[`n.${output}`, 'o.color']]), { leds }).leds

describe('compositing', () => {
  const layers = { base: [0.2, 0.4, 0.6], layer: [1, 0, 0] }

  it('Layer Mix: a mask of 0 shows the base, a mask of 1 at full opacity shows the layer, and the two multiply', () => {
    expect(one('layerMix', 'color', { ...layers, mask: 0 })[0]).toEqual([51, 102, 153])
    expect(one('layerMix', 'color', { ...layers, mask: 1, opacity: 1 })[0]).toEqual([255, 0, 0])
    expect(one('layerMix', 'color', { ...layers, mask: 0.5, opacity: 0.5 })[0]).toEqual(one('layerMix', 'color', { ...layers, mask: 0.25, opacity: 1 })[0])
  })

  it('Layer Mix uses the blend modes of Color Mix', () => {
    expect(one('layerMix', 'color', { base: [0.5, 0.5, 0.5], layer: [1, 0, 0], mode: 'multiply' })[0]).toEqual([128, 0, 0])
  })

  it('Mask: hard with no softness, a ramp with some, inverted on request', () => {
    expect(one('mask', 'mask', { softness: 0 }, 4).map(([r]) => r)).toEqual([0, 0, 255, 255])
    const soft = one('mask', 'mask', { softness: 1 }, 4).map(([r]) => r)
    expect(soft[0]).toBeGreaterThan(0)
    expect(soft[3]).toBeLessThan(255)
    expect(soft).toEqual([...soft].sort((a, b) => a - b))
    expect(one('mask', 'mask', { softness: 0, invert: true }, 4).map(([r]) => r)).toEqual([255, 255, 0, 0])
  })

  it('Brightness Ceiling scales down to the ceiling, keeps the hue, and leaves dim colors alone', () => {
    expect(one('brightnessCeiling', 'color', { color: [1, 0.5, 0], ceiling: 0.5 })[0]).toEqual([128, 64, 0])
    expect(one('brightnessCeiling', 'color', { color: [0.2, 0.12, 0], ceiling: 0.5 })[0]).toEqual([51, 31, 0])
  })

  it('Palette: presets start and end where their tables say, and Repeat wraps', () => {
    const heat = one('gradientPalette', 'color', { palette: 'heat', repeat: false }, 64)
    expect(heat[0][0]).toBeLessThan(12)
    // the last LED sits half a cell before position 1, so it is almost, not exactly, the final white
    expect(Math.min(...heat[63])).toBeGreaterThan(240)
    const doc = (position: number) => renderGraph(graph(
      [node('v', 'value', { value: position }), node('p', 'gradientPalette', { palette: 'party' }), node('o', 'output')],
      [['v.value', 'p.position'], ['p.color', 'o.color']],
    ), { leds: 1 }).leds[0]
    expect(doc(1.25)).toEqual(doc(0.25))
    expect(doc(0)).toEqual([85, 0, 171])
  })
})

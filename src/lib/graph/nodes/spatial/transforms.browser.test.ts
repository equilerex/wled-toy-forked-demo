import { describe, expect, it } from 'vitest'
import { graph, node, renderGraph } from '@/lib/graph/testing'

/** Red and green bytes of a vec2 output on an 8 LED strip at y = 0.5. */
const render = (kind: string, output: string, values = {}, leds = 8) =>
  renderGraph(graph([node('t', kind, values), node('o', 'output')], [[`t.${output}`, 'o.color']]), { leds }).leds

const x = (i: number, leds = 8) => (i + 0.5) / leds

describe('coordinate transforms', () => {
  it('Mirror: 1 at the center falling to 0 at both ends, or the reverse', () => {
    const toCenter = render('mirror', 'uv').map(([r]) => r)
    expect(toCenter).toEqual([...Array(8).keys()].map((i) => Math.round((1 - Math.abs(x(i) - 0.5) / 0.5) * 255)))
    expect(toCenter).toEqual([...toCenter].reverse())
    const fromCenter = render('mirror', 'uv', { mode: 'fromCenter' }).map(([r]) => r)
    expect(fromCenter[0]).toBe(223)
    expect(fromCenter[3]).toBe(32)
  })

  it('Mirror on one axis leaves the other alone', () => {
    expect(render('mirror', 'uv', { axis: 'y' }).map(([r]) => r)).toEqual([...Array(8).keys()].map((i) => Math.round(x(i) * 255)))
  })

  it('Tile: UV restarts in each tile and Cell counts them', () => {
    expect(render('tile', 'uv', { count: [2, 1] }).map(([r]) => r)).toEqual([32, 96, 159, 223, 32, 96, 159, 223])
    expect(render('tile', 'cell', { count: [2, 1] }).map(([r]) => r)).toEqual([0, 0, 0, 0, 255, 255, 255, 255])
  })

  it('Rotate by half a turn flips the strip; by a quarter turn it reads the column', () => {
    expect(render('rotate', 'uv', { angle: 0.5 }).map(([r]) => r)).toEqual([...Array(8).keys()].map((i) => Math.round((1 - x(i)) * 255)))
    // a quarter turn counter-clockwise: what was at the bottom is now on the right, so x along the strip reads as y
    // sin and cos of a quarter turn are not exact in float32, so allow a byte of slack
    render('rotate', 'uv', { angle: 0.25 }).forEach(([r, g], i) => {
      expect(Math.abs(r - 128)).toBeLessThanOrEqual(1)
      expect(Math.abs(g - Math.round((1 - x(i)) * 255))).toBeLessThanOrEqual(1)
    })
  })

  it('Polar: angle runs 0 to 1 around the center, radius is 0 there', () => {
    const angle = render('polar', 'angle').map(([r]) => r)
    // left of center points at pi (the 0 / 1 seam sits there), right of center at 0 which maps to 0.5
    expect(angle.slice(4)).toEqual([128, 128, 128, 128])
    const radius = render('polar', 'radius').map(([r]) => r)
    expect(radius).toEqual([...Array(8).keys()].map((i) => Math.round(Math.abs(x(i) - 0.5) * 2 * 255)))
  })

  it('Segment Split: local restarts, segment counts, fraction spreads over 0 to 1', () => {
    expect(render('segmentSplit', 'local', { count: 2 }).map(([r]) => r)).toEqual([32, 96, 159, 223, 32, 96, 159, 223])
    expect(render('segmentSplit', 'fraction', { count: 4 }).map(([r]) => r)).toEqual([0, 0, 85, 85, 170, 170, 255, 255])
  })
})

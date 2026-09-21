import { describe, expect, it } from 'vitest'
import { graph, node, renderGraph } from '@/lib/graph/testing'

const near = (actual: number[][], expected: number[][], tolerance = 2) =>
  actual.forEach((led, i) => led.forEach((c, k) => expect(Math.abs(c - expected[i][k]), `LED ${i} channel ${k}: ${led} vs ${expected[i]}`).toBeLessThanOrEqual(tolerance)))

describe('ported nodes', () => {
  it('Checker Texture at scale 4 alternates its two colors every two of eight LEDs', () => {
    const { leds } = renderGraph(graph(
      [node('c', 'checkerTexture', { scale: 4, color1: [1, 0, 0], color2: [0, 0, 1] }), node('o', 'output')],
      [['c.color', 'o.color']],
    ), { scanY: 0.1 })
    const red = [255, 0, 0]
    const blue = [0, 0, 255]
    // row y = 0.1 * 4 is cell 0, so the color flips with the x cell alone
    expect(leds).toEqual([blue, blue, red, red, blue, blue, red, red])
  })

  it('Color Mix: Multiply at factor 1, and Mix at factor 0.25', () => {
    const mix = (values: object) => renderGraph(graph([node('m', 'colorMix', { color1: [0.5, 0.5, 0.5], color2: [1, 0, 0], ...values }), node('o', 'output')], [['m.color', 'o.color']]), { leds: 1 }).leds[0]
    expect(mix({ mode: 'multiply', factor: 1 })).toEqual([128, 0, 0])
    near([mix({ mode: 'mix', factor: 0.25 })], [[159, 96, 96]])
  })

  it('Brightness/Contrast at 0 / 0 changes nothing', () => {
    const { leds } = renderGraph(graph([node('b', 'brightnessContrast', { color: [0.2, 0.5, 0.8] }), node('o', 'output')], [['b.color', 'o.color']]), { leds: 1 })
    expect(leds[0]).toEqual([51, 128, 204])
  })

  it('RGB to HSV and back is lossless to a byte', () => {
    const { leds } = renderGraph(graph(
      [node('a', 'rgb2hsv', { color: [0.8, 0.3, 0.55] }), node('b', 'hsv2rgb'), node('o', 'output')],
      [['a.hsv', 'b.hsv'], ['b.color', 'o.color']],
    ), { leds: 1 })
    near(leds, [[204, 77, 140]], 1)
  })

  it('Combine Color wraps the hue in HSV and HSL', () => {
    const color = (mode: string, a: number) => renderGraph(graph([node('c', 'combineColor', { mode, a, b: 1, c: mode === 'hsl' ? 0.5 : 1 }), node('o', 'output')], [['c.color', 'o.color']]), { leds: 1 }).leds[0]
    for (const mode of ['hsv', 'hsl']) {
      near([color(mode, 1.25)], [color(mode, 0.25)], 1)
      near([color(mode, -0.75)], [color(mode, 0.25)], 1)
      expect(color(mode, 0.25)).not.toEqual(color(mode, 0.5))
    }
  })

  it('emits a shared chunk once and leaves unused chunks out', () => {
    const { shader, compileError } = renderGraph(graph(
      [node('w', 'waveTexture'), node('n', 'noiseTexture'), node('m', 'math', { op: 'add' }), node('o', 'output')],
      [['w.fac', 'm.a'], ['n.fac', 'm.b'], ['m.result', 'o.color']],
    ))
    expect(compileError).toBeNull()
    expect(shader.code.match(/float noise_fbm\(/g)).toHaveLength(1)
    expect(shader.code.match(/float node_hash\(float/g)).toHaveLength(1)
    expect(shader.code).not.toContain('node_mix_blend')
    expect(shader.code.indexOf('node_hash(float')).toBeLessThan(shader.code.indexOf('float noise1('))
  })

  it('compile errors still point at the node that emitted the line when chunks sit above it', () => {
    const { shader } = renderGraph(graph([node('w', 'waveTexture'), node('o', 'output')], [['w.color', 'o.color']]))
    const line = shader.code.split('\n').findIndex((l) => l.includes('wave_texture(0,')) + 1
    expect(shader.lineNodes[line]).toBe('w')
  })
})

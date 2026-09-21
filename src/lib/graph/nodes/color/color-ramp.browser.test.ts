import { describe, expect, it } from 'vitest'
import { RAMP_INTERPOLATIONS, sampleRamp, type ColorRamp } from './color-ramp'
import { graph, node, renderGraph } from '@/lib/graph/testing'

describe('color ramp', () => {
  const stops = [{ position: 0, color: [1, 0, 0] }, { position: 0.3, color: [0, 1, 0] }, { position: 0.3, color: [0, 0.2, 1] }, { position: 1, color: [1, 1, 1] }]

  it.each(RAMP_INTERPOLATIONS.map((i) => i.value))('%s: the shader and the editor preview agree', (interpolation) => {
    const ramp: ColorRamp = { interpolation, stops }
    const leds = 16
    const rendered = renderGraph(graph([node('r', 'colorRamp', { ramp }), node('o', 'output')], [['r.color', 'o.color']]), { leds })
    expect(rendered.compileError, rendered.shader.code).toBeNull()
    rendered.leds.forEach((led, i) => {
      const expected = sampleRamp(ramp, (i + 0.5) / leds).map((c) => Math.min(1, Math.max(0, c)) * 255)
      led.forEach((channel, k) => expect(Math.abs(channel - expected[k]), `LED ${i} channel ${k}`).toBeLessThanOrEqual(2))
    })
  })
})

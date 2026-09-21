import { defineNode } from '@/lib/graph/define/define'
import { colorMixChunk } from '@/lib/graph/compile/glsl/color-mix'
import { Bool, Color, Enum, Float, enumIndex } from '@/lib/graph/define/types'

// order is the mode index colorMix() switches on
export const BLEND_MODES = [
  { value: 'mix', label: 'Mix', group: 'Mix' }, { value: 'add', label: 'Add', group: 'Lighten' }, { value: 'multiply', label: 'Multiply', group: 'Darken' }, { value: 'screen', label: 'Screen', group: 'Lighten' },
  { value: 'overlay', label: 'Overlay', group: 'Contrast' }, { value: 'subtract', label: 'Subtract', group: 'Difference' }, { value: 'divide', label: 'Divide', group: 'Difference' }, { value: 'difference', label: 'Difference', group: 'Difference' },
  { value: 'exclusion', label: 'Exclusion', group: 'Difference' }, { value: 'darken', label: 'Darken', group: 'Darken' }, { value: 'lighten', label: 'Lighten', group: 'Lighten' }, { value: 'dodge', label: 'Dodge', group: 'Lighten' },
  { value: 'burn', label: 'Burn', group: 'Darken' }, { value: 'hue', label: 'Hue', group: 'Color' }, { value: 'saturation', label: 'Saturation', group: 'Color' }, { value: 'value', label: 'Value', group: 'Color' },
  { value: 'color', label: 'Color', group: 'Color' }, { value: 'softLight', label: 'Soft Light', group: 'Contrast' }, { value: 'linearLight', label: 'Linear Light', group: 'Contrast' },
] as const

export const colorMixNode = defineNode('colorMix', {
  title: 'Color Mix',
  description: 'Blend two colors with one of the usual layer modes. Factor is how much of the blend replaces Color 1.',
  category: 'color',
  includes: [colorMixChunk],
  input: {
    mode: { type: Enum(BLEND_MODES), label: '', connectable: false, props: { label: 'Blend Mode' } },
    clampResult: { type: Bool, default: true, connectable: false },
    clampFactor: { type: Bool, default: true, connectable: false },
    factor: { type: Float, default: 0.5, props: { min: 0, max: 1, decimals: 2 } },
    color1: { type: Color, label: 'Color 1', default: [1, 1, 1] },
    color2: { type: Color, label: 'Color 2', default: [0, 0, 0] },
  },
  output: { color: Color },
  exec: ({ mode, clampResult, clampFactor, factor, color1, color2 }, ctx) =>
    ctx.call('colorMix', [factor.expr, enumIndex(BLEND_MODES, mode), color1.expr, color2.expr, clampResult ? '1' : '0', clampFactor ? '1' : '0'], { color: 'vec3' }),
})

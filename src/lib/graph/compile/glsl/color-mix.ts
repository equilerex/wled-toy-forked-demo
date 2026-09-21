import type { GlslChunk } from './chunk'
import { colorChunk } from './color'

/** Dispatches a blend mode index to its node_mix function. */
export const colorMixChunk: GlslChunk = {
  id: 'color-mix',
  requires: [colorChunk],
  source: /* glsl */ `
void colorMix(
    float mixFactor,
    int mixMode,
    vec3 color1,
    vec3 color2,
    int clampResult,
    int clampFactor,
    out vec3 Color
) {
    mixFactor = clampFactor == 1 ? clamp(mixFactor, 0.0, 1.0) : mixFactor;
    switch(mixMode) {
        case 0:
            Color = node_mix_blend(mixFactor, color1, color2);
            break;
        case 1:
            Color = node_mix_add(mixFactor, color1, color2);
            break;
        case 2:
            Color = node_mix_mul(mixFactor, color1, color2);
            break;
        case 3:
            Color = node_mix_screen(mixFactor, color1, color2);
            break;
        case 4:
            Color = node_mix_overlay(mixFactor, color1, color2);
            break;
        case 5:
            Color = node_mix_sub(mixFactor, color1, color2);
            break;
        case 6:
            Color = node_mix_div(mixFactor, color1, color2);
            break;
        case 7:
            Color = node_mix_diff(mixFactor, color1, color2);
            break;
        case 8:
            Color = node_mix_exclusion(mixFactor, color1, color2);
            break;
        case 9:
            Color = node_mix_dark(mixFactor, color1, color2);
            break;
        case 10:
            Color = node_mix_light(mixFactor, color1, color2);
            break;
        case 11:
            Color = node_mix_dodge(mixFactor, color1, color2);
            break;
        case 12:
            Color = node_mix_burn(mixFactor, color1, color2);
            break;
        case 13:
            Color = node_mix_hue(mixFactor, color1, color2);
            break;
        case 14:
            Color = node_mix_sat(mixFactor, color1, color2);
            break;
        case 15:
            Color = node_mix_val(mixFactor, color1, color2);
            break;
        case 16:
            Color = node_mix_color(mixFactor, color1, color2);
            break;
        case 17:
            Color = node_mix_soft(mixFactor, color1, color2);
            break;
        case 18:
            Color = node_mix_linear(mixFactor, color1, color2);
            break;
        default:
            Color = color1;
            break;
    }
    Color = clampResult == 1 ? clamp(Color, 0.0, 1.0) : Color;
}
`,
}

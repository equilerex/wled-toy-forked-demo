import type { GlslChunk } from './chunk'

/** Blender color conversions and the blend functions behind Color Mix (node_color.h, node_color_blend.h). */
export const colorChunk: GlslChunk = {
  id: 'color',
  requires: [],
  source: /* glsl */ `
/* SPDX-FileCopyrightText: 2011-2022 Blender Foundation
 *
 * SPDX-License-Identifier: Apache-2.0 */

const int COLORTYPE_RGB = 0;
const int COLORTYPE_HSV = 1;
const int COLORTYPE_HSL = 2;

float color_srgb_to_scene_linear(float c)
{
  if (c < 0.04045) {
    return (c < 0.0) ? 0.0 : c * (1.0 / 12.92);
  }
  else {
    return pow((c + 0.055) * (1.0 / 1.055), 2.4);
  }
}

float color_scene_linear_to_srgb(float c)
{
  if (c < 0.0031308) {
    return (c < 0.0) ? 0.0 : c * 12.92;
  }
  else {
    return 1.055 * pow(c, 1.0 / 2.4) - 0.055;
  }
}

vec3 color_srgb_to_scene_linear(vec3 c)
{
  return vec3(color_srgb_to_scene_linear(c[0]),
               color_srgb_to_scene_linear(c[1]),
               color_srgb_to_scene_linear(c[2]));
}

vec3 color_scene_linear_to_srgb(vec3 c)
{
  return vec3(color_scene_linear_to_srgb(c[0]),
               color_scene_linear_to_srgb(c[1]),
               color_scene_linear_to_srgb(c[2]));
}

vec3 color_unpremultiply(vec3 c, float alpha)
{
  if (alpha != 1.0 && alpha != 0.0) {
    return c / alpha;
  }

  return c;
}

/* vec3 Operations */

vec3 xyY_to_xyz(float x, float y, float Y)
{
  float X, Z;

  if (y != 0.0) {
    X = (x / y) * Y;
  }
  else {
    X = 0.0;
  }

  if (y != 0.0 && Y != 0.0) {
    Z = ((1.0 - x - y) / y) * Y;
  }
  else {
    Z = 0.0;
  }

  return vec3(X, Y, Z);
}

vec3 xyz_to_rgb(float x, float y, float z)
{
  return vec3(3.240479 * x + -1.537150 * y + -0.498535 * z,
               -0.969256 * x + 1.875991 * y + 0.041556 * z,
               0.055648 * x + -0.204043 * y + 1.057311 * z);
}

vec3 rgb_to_hsv(vec3 rgb)
{
  float cmax, cmin, h, s, v, cdelta;
  vec3 c;

  cmax = max(rgb[0], max(rgb[1], rgb[2]));
  cmin = min(rgb[0], min(rgb[1], rgb[2]));
  cdelta = cmax - cmin;

  v = cmax;

  if (cmax != 0.0) {
    s = cdelta / cmax;
  }
  else {
    s = 0.0;
    h = 0.0;
  }

  if (s == 0.0) {
    h = 0.0;
  }
  else {
    c = (vec3(cmax, cmax, cmax) - rgb) / cdelta;

    if (rgb[0] == cmax) {
      h = c[2] - c[1];
    }
    else if (rgb[1] == cmax) {
      h = 2.0 + c[0] - c[2];
    }
    else {
      h = 4.0 + c[1] - c[0];
    }

    h /= 6.0;

    if (h < 0.0) {
      h += 1.0;
    }
  }

  return vec3(h, s, v);
}

vec3 hsv_to_rgb(vec3 hsv)
{
  float i, f, p, q, t, h, s, v;
  vec3 rgb;

  // Blender only folds h == 1.0 back to 0; hue is a circle, so anything outside 0..1 wraps
  h = fract(hsv[0]);
  s = hsv[1];
  v = hsv[2];

  if (s == 0.0) {
    rgb = vec3(v, v, v);
  }
  else {
    h *= 6.0;
    i = floor(h);
    f = h - i;
    rgb = vec3(f, f, f);
    p = v * (1.0 - s);
    q = v * (1.0 - (s * f));
    t = v * (1.0 - (s * (1.0 - f)));

    if (i == 0.0) {
      rgb = vec3(v, t, p);
    }
    else if (i == 1.0) {
      rgb = vec3(q, v, p);
    }
    else if (i == 2.0) {
      rgb = vec3(p, v, t);
    }
    else if (i == 3.0) {
      rgb = vec3(p, q, v);
    }
    else if (i == 4.0) {
      rgb = vec3(t, p, v);
    }
    else {
      rgb = vec3(v, p, q);
    }
  }

  return rgb;
}

vec3 rgb_to_hsl(vec3 rgb)
{
  float cmax, cmin, h, s, l;

  cmax = max(rgb[0], max(rgb[1], rgb[2]));
  cmin = min(rgb[0], min(rgb[1], rgb[2]));
  l = min(1.0, (cmax + cmin) / 2.0);

  if (cmax == cmin) {
    h = s = 0.0; /* achromatic */
  }
  else {
    float cdelta = cmax - cmin;
    s = l > 0.5 ? cdelta / (2.0 - cmax - cmin) : cdelta / (cmax + cmin);
    if (cmax == rgb[0]) {
      h = (rgb[1] - rgb[2]) / cdelta + (rgb[1] < rgb[2] ? 6.0 : 0.0);
    }
    else if (cmax == rgb[1]) {
      h = (rgb[2] - rgb[0]) / cdelta + 2.0;
    }
    else {
      h = (rgb[0] - rgb[1]) / cdelta + 4.0;
    }
  }
  h /= 6.0;

  return vec3(h, s, l);
}

vec3 hsl_to_rgb(vec3 hsl)
{
  float nr, ng, nb, chroma, h, s, l;

  h = fract(hsl[0]);
  s = hsl[1];
  l = hsl[2];

  nr = abs(h * 6.0 - 3.0) - 1.0;
  ng = 2.0 - abs(h * 6.0 - 2.0);
  nb = 2.0 - abs(h * 6.0 - 4.0);

  nr = clamp(nr, 0.0, 1.0);
  nb = clamp(nb, 0.0, 1.0);
  ng = clamp(ng, 0.0, 1.0);

  chroma = (1.0 - abs(2.0 * l - 1.0)) * s;

  return vec3((nr - 0.5) * chroma + l, (ng - 0.5) * chroma + l, (nb - 0.5) * chroma + l);
}

vec3 node_mix_blend(float t, vec3 col1, vec3 col2)
{
  return mix(col1, col2, t);
}

vec3 node_mix_add(float t, vec3 col1, vec3 col2)
{
  return mix(col1, col1 + col2, t);
}

vec3 node_mix_mul(float t, vec3 col1, vec3 col2)
{
  return mix(col1, col1 * col2, t);
}

vec3 node_mix_screen(float t, vec3 col1, vec3 col2)
{
  float tm = 1.0 - t;

  return vec3(1.0) - (vec3(tm) + t * (vec3(1.0) - col2)) * (vec3(1.0) - col1);
}

vec3 node_mix_overlay(float t, vec3 col1, vec3 col2)
{
  float tm = 1.0 - t;

  vec3 outcol = col1;

  if (outcol[0] < 0.5) {
    outcol[0] *= tm + 2.0 * t * col2[0];
  }
  else {
    outcol[0] = 1.0 - (tm + 2.0 * t * (1.0 - col2[0])) * (1.0 - outcol[0]);
  }

  if (outcol[1] < 0.5) {
    outcol[1] *= tm + 2.0 * t * col2[1];
  }
  else {
    outcol[1] = 1.0 - (tm + 2.0 * t * (1.0 - col2[1])) * (1.0 - outcol[1]);
  }

  if (outcol[2] < 0.5) {
    outcol[2] *= tm + 2.0 * t * col2[2];
  }
  else {
    outcol[2] = 1.0 - (tm + 2.0 * t * (1.0 - col2[2])) * (1.0 - outcol[2]);
  }

  return outcol;
}

vec3 node_mix_sub(float t, vec3 col1, vec3 col2)
{
  return mix(col1, col1 - col2, t);
}

vec3 node_mix_div(float t, vec3 col1, vec3 col2)
{
  float tm = 1.0 - t;

  vec3 outcol = col1;

  if (col2[0] != 0.0) {
    outcol[0] = tm * outcol[0] + t * outcol[0] / col2[0];
  }
  if (col2[1] != 0.0) {
    outcol[1] = tm * outcol[1] + t * outcol[1] / col2[1];
  }
  if (col2[2] != 0.0) {
    outcol[2] = tm * outcol[2] + t * outcol[2] / col2[2];
  }

  return outcol;
}

vec3 node_mix_diff(float t, vec3 col1, vec3 col2)
{
  return mix(col1, abs(col1 - col2), t);
}

vec3 node_mix_exclusion(float t, vec3 col1, vec3 col2)
{
  return max(mix(col1, col1 + col2 - 2.0 * col1 * col2, t), 0.0);
}

vec3 node_mix_dark(float t, vec3 col1, vec3 col2)
{
  return mix(col1, min(col1, col2), t);
}

vec3 node_mix_light(float t, vec3 col1, vec3 col2)
{
  return mix(col1, max(col1, col2), t);
}

vec3 node_mix_dodge(float t, vec3 col1, vec3 col2)
{
  vec3 outcol = col1;

  if (outcol[0] != 0.0) {
    float tmp = 1.0 - t * col2[0];
    if (tmp <= 0.0) {
      outcol[0] = 1.0;
    }
    else if ((tmp = outcol[0] / tmp) > 1.0) {
      outcol[0] = 1.0;
    }
    else {
      outcol[0] = tmp;
    }
  }
  if (outcol[1] != 0.0) {
    float tmp = 1.0 - t * col2[1];
    if (tmp <= 0.0) {
      outcol[1] = 1.0;
    }
    else if ((tmp = outcol[1] / tmp) > 1.0) {
      outcol[1] = 1.0;
    }
    else {
      outcol[1] = tmp;
    }
  }
  if (outcol[2] != 0.0) {
    float tmp = 1.0 - t * col2[2];
    if (tmp <= 0.0) {
      outcol[2] = 1.0;
    }
    else if ((tmp = outcol[2] / tmp) > 1.0) {
      outcol[2] = 1.0;
    }
    else {
      outcol[2] = tmp;
    }
  }

  return outcol;
}

vec3 node_mix_burn(float t, vec3 col1, vec3 col2)
{
  float tmp, tm = 1.0 - t;

  vec3 outcol = col1;

  tmp = tm + t * col2[0];
  if (tmp <= 0.0) {
    outcol[0] = 0.0;
  }
  else if ((tmp = (1.0 - (1.0 - outcol[0]) / tmp)) < 0.0) {
    outcol[0] = 0.0;
  }
  else if (tmp > 1.0) {
    outcol[0] = 1.0;
  }
  else {
    outcol[0] = tmp;
  }

  tmp = tm + t * col2[1];
  if (tmp <= 0.0) {
    outcol[1] = 0.0;
  }
  else if ((tmp = (1.0 - (1.0 - outcol[1]) / tmp)) < 0.0) {
    outcol[1] = 0.0;
  }
  else if (tmp > 1.0) {
    outcol[1] = 1.0;
  }
  else {
    outcol[1] = tmp;
  }

  tmp = tm + t * col2[2];
  if (tmp <= 0.0) {
    outcol[2] = 0.0;
  }
  else if ((tmp = (1.0 - (1.0 - outcol[2]) / tmp)) < 0.0) {
    outcol[2] = 0.0;
  }
  else if (tmp > 1.0) {
    outcol[2] = 1.0;
  }
  else {
    outcol[2] = tmp;
  }

  return outcol;
}

vec3 node_mix_hue(float t, vec3 col1, vec3 col2)
{
  vec3 outcol = col1;
  vec3 hsv2 = rgb_to_hsv(col2);

  if (hsv2[1] != 0.0) {
    vec3 hsv = rgb_to_hsv(outcol);
    hsv[0] = hsv2[0];
    vec3 tmp = hsv_to_rgb(hsv);

    outcol = mix(outcol, tmp, t);
  }

  return outcol;
}

vec3 node_mix_sat(float t, vec3 col1, vec3 col2)
{
  float tm = 1.0 - t;

  vec3 outcol = col1;

  vec3 hsv = rgb_to_hsv(outcol);

  if (hsv[1] != 0.0) {
    vec3 hsv2 = rgb_to_hsv(col2);

    hsv[1] = tm * hsv[1] + t * hsv2[1];
    outcol = hsv_to_rgb(hsv);
  }

  return outcol;
}

vec3 node_mix_val(float t, vec3 col1, vec3 col2)
{
  float tm = 1.0 - t;

  vec3 hsv = rgb_to_hsv(col1);
  vec3 hsv2 = rgb_to_hsv(col2);

  hsv[2] = tm * hsv[2] + t * hsv2[2];

  return hsv_to_rgb(hsv);
}

vec3 node_mix_color(float t, vec3 col1, vec3 col2)
{
  vec3 outcol = col1;
  vec3 hsv2 = rgb_to_hsv(col2);

  if (hsv2[1] != 0.0) {
    vec3 hsv = rgb_to_hsv(outcol);
    hsv[0] = hsv2[0];
    hsv[1] = hsv2[1];
    vec3 tmp = hsv_to_rgb(hsv);

    outcol = mix(outcol, tmp, t);
  }

  return outcol;
}

vec3 node_mix_soft(float t, vec3 col1, vec3 col2)
{
  float tm = 1.0 - t;

  vec3 one = vec3(1.0);
  vec3 scr = one - (one - col2) * (one - col1);

  return tm * col1 + t * ((one - col1) * col2 * col1 + col1 * scr);
}

vec3 node_mix_linear(float t, vec3 col1, vec3 col2)
{
  vec3 outcol = col1;

  if (col2[0] > 0.5) {
    outcol[0] = col1[0] + t * (2.0 * (col2[0] - 0.5));
  }
  else {
    outcol[0] = col1[0] + t * (2.0 * (col2[0]) - 1.0);
  }

  if (col2[1] > 0.5) {
    outcol[1] = col1[1] + t * (2.0 * (col2[1] - 0.5));
  }
  else {
    outcol[1] = col1[1] + t * (2.0 * (col2[1]) - 1.0);
  }

  if (col2[2] > 0.5) {
    outcol[2] = col1[2] + t * (2.0 * (col2[2] - 0.5));
  }
  else {
    outcol[2] = col1[2] + t * (2.0 * (col2[2]) - 1.0);
  }

  return outcol;
}

vec3 node_mix_clamp(vec3 col)
{
  vec3 outcol = col;

  outcol[0] = clamp(col[0], 0.0, 1.0);
  outcol[1] = clamp(col[1], 0.0, 1.0);
  outcol[2] = clamp(col[2], 0.0, 1.0);

  return outcol;
}

vec3 node_combine_color(int color_type, float r, float g, float b)
{
    vec3 Color;
    if (color_type == COLORTYPE_RGB) {
        Color = vec3(r, g, b);
    }
    else if (color_type == COLORTYPE_HSV) {
        Color = hsv_to_rgb(vec3(r, g, b));
    }
    else if (color_type == COLORTYPE_HSL) {
        Color = hsl_to_rgb(vec3(r, g, b));
    }
    else {
        Color = vec3(0.0, 0.0, 0.0);
    }
    return Color;
}
`,
}

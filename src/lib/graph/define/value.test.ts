import { describe, expect, it } from 'vitest'
import { castTo, fmt, swizzle, type Value } from './value'

const v = (expr: string, type: Value['type']): Value => ({ expr, type })

describe('castTo', () => {
  it.each([
    ['float', 'vec3', 'vec3(a)'],
    ['int', 'vec2', 'vec2(float(a))'],
    ['vec2', 'vec3', 'vec3(a, 0.0)'],
    ['vec2', 'vec4', 'vec4(a, 0.0, 1.0)'],
    ['vec3', 'vec4', 'vec4(a, 1.0)'],
    ['vec4', 'vec2', 'a.xy'],
    ['vec3', 'int', 'int(a.x)'],
    ['vec3', 'vec3', 'a'],
  ] as const)('%s to %s', (from, to, expected) => {
    expect(castTo(v('a', from), to)).toEqual({ expr: expected, type: to })
  })

  it('parenthesizes compound expressions before a swizzle', () => {
    expect(castTo(v('a + b', 'vec4'), 'float').expr).toBe('(a + b).x')
  })

  it('refuses types with no numeric form', () => {
    expect(() => castTo(v('m', 'mat2'), 'float')).toThrow(/Cannot cast mat2/)
    expect(() => castTo(v('a', 'float'), 'sampler2D')).toThrow(/Cannot cast float/)
  })
})

describe('swizzle', () => {
  it('types the result by component count', () => {
    expect(swizzle(v('c', 'vec4'), 'bgr')).toEqual({ expr: 'c.bgr', type: 'vec3' })
  })

  it('rejects components the value lacks, mixed sets, and scalars', () => {
    expect(() => swizzle(v('a', 'vec2'), 'z')).toThrow()
    expect(() => swizzle(v('a', 'vec3'), 'xg')).toThrow()
    expect(() => swizzle(v('a', 'float'), 'x')).toThrow()
  })
})

describe('fmt', () => {
  it('always yields a GLSL float literal', () => {
    expect([fmt(1), fmt(0.25), fmt(1e-7), fmt(NaN), fmt(1234.56789)]).toEqual(['1.0', '0.25', '0.0', '0.0', '1234.5679'])
  })
})

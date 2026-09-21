import { expect, it } from 'vitest'
import { parseGraphFile, serializeGraphFile } from './file'
import { renderGraph } from '@/lib/graph/testing'
import sampleFile from '../../../../graphs/high-contrast-music.wledgraph?raw'

it('the sample .wledgraph file opens into a shader that compiles and renders, and survives another save', () => {
  const doc = parseGraphFile(sampleFile)
  const first = renderGraph(doc, { leds: 8, time: 1 })
  expect(first.shader.error).toBeNull()
  expect(first.compileError, first.shader.code).toBeNull()
  // silence renders black: the graph is driven by audio, which a test frame does not have
  expect(first.leds).toHaveLength(8)

  const saved = parseGraphFile(serializeGraphFile(doc))
  expect(saved).toEqual(doc)
  expect(renderGraph(saved, { leds: 8, time: 1 }).shader.code).toBe(first.shader.code)
})

import { describe, expect, it } from 'vitest'
import { classifyFile, dragHint, isConfigExport, isGraphEnvelope, planDrop } from './file-drop'

const file = (name: string, type = '') => ({ name, type })

describe('classifyFile', () => {
  it('takes the media type when the name says nothing', () => {
    expect(classifyFile(file('recording', 'audio/mpeg'))).toBe('audio')
    expect(classifyFile(file('photo', 'image/heic'))).toBe('image')
    expect(classifyFile(file('export', 'application/json'))).toBe('config')
  })

  it('takes the extension when the browser gives no type, whatever its case', () => {
    expect(['a.mp3', 'a.wav', 'a.ogg', 'a.oga', 'a.opus', 'a.flac', 'a.m4a', 'a.aac', 'a.webm'].map((name) => classifyFile(file(name)))).toEqual(Array(9).fill('audio'))
    expect(['a.png', 'a.jpg', 'a.jpeg', 'a.webp', 'a.gif', 'a.bmp', 'a.svg'].map((name) => classifyFile(file(name)))).toEqual(Array(7).fill('image'))
    expect(['a.glsl', 'a.frag', 'a.fs'].map((name) => classifyFile(file(name)))).toEqual(['shader', 'shader', 'shader'])
    expect(classifyFile(file('Aurora.WLEDGRAPH'))).toBe('graph')
    expect(classifyFile(file('wledtoy-1.json'))).toBe('config')
  })

  it('lets the extension win over a type that misleads', () => {
    expect(classifyFile(file('loop.webm', 'video/webm'))).toBe('audio')
    expect(classifyFile(file('aurora.wledgraph', 'application/json'))).toBe('graph')
    expect(classifyFile(file('wave.frag', 'text/plain'))).toBe('shader')
  })

  it('knows nothing about the rest', () => {
    expect(classifyFile(file('notes.txt', 'text/plain'))).toBe('unknown')
    expect(classifyFile(file('clip.mp4', 'video/mp4'))).toBe('unknown')
    expect(classifyFile(file('Makefile'))).toBe('unknown')
    expect(classifyFile(file('archive.tar.gz', 'application/gzip'))).toBe('unknown')
  })
})

describe('planDrop', () => {
  it('runs settings and media first and documents last, the graph after the shader', () => {
    const plan = planDrop([file('a.wledgraph'), file('b.glsl'), file('c.png'), file('d.mp3'), file('e.json')])
    expect(plan.steps.map((step) => [step.kind, step.file.name])).toEqual([['config', 'e.json'], ['audio', 'd.mp3'], ['image', 'c.png'], ['shader', 'b.glsl'], ['graph', 'a.wledgraph']])
    expect(plan.skipped).toEqual([])
    expect(plan.unknown).toEqual([])
  })

  it('takes the first file of a kind and skips the others', () => {
    const plan = planDrop([file('one.wledgraph'), file('two.wledgraph'), file('a.glsl'), file('b.frag'), file('x.png'), file('y.jpg')])
    expect(plan.steps.map((step) => step.file.name)).toEqual(['x.png', 'a.glsl', 'one.wledgraph'])
    expect(plan.skipped.map((skipped) => skipped.name)).toEqual(['two.wledgraph', 'b.frag', 'y.jpg'])
  })

  it('sets unknown files apart and does nothing with them', () => {
    const plan = planDrop([file('notes.txt', 'text/plain'), file('song.flac')])
    expect(plan.steps.map((step) => step.kind)).toEqual(['audio'])
    expect(plan.unknown.map((unknown) => unknown.name)).toEqual(['notes.txt'])
  })

  it('has nothing to do for an empty drop', () => {
    expect(planDrop([])).toEqual({ steps: [], skipped: [], unknown: [] })
  })
})

describe('dragHint', () => {
  it('names what a conclusive type will do, by mode for an image', () => {
    expect(dragHint(['audio/wav'], 'shader')).toBe('Drop to use as the audio track')
    expect(dragHint(['image/png'], 'graph')).toBe('Drop to add an Image Texture here')
    expect(dragHint(['image/png'], 'shader')).toBe('Drop to use as the image texture')
    expect(dragHint(['image/png'], 'reference')).toBe('Drop to use as the image texture')
    expect(dragHint(['application/json'], 'graph')).toBe('Drop to import settings')
    expect(dragHint(['video/mp4'], 'graph')).toBe('This file type is not supported')
  })

  it('stays neutral when the type is empty or could be a shader or a graph', () => {
    expect(dragHint([''], 'graph')).toBe('Drop file')
    expect(dragHint(['text/plain'], 'graph')).toBe('Drop file')
    expect(dragHint(['application/octet-stream'], 'graph')).toBe('Drop file')
    expect(dragHint([], 'graph')).toBe('Drop file')
  })

  it('stays neutral for a mixed drag and speaks for several files of one kind', () => {
    expect(dragHint(['audio/wav', 'image/png'], 'graph')).toBe('Drop files')
    expect(dragHint(['image/png', ''], 'graph')).toBe('Drop files')
    expect(dragHint(['image/png', 'image/jpeg'], 'graph')).toBe('Drop to add an Image Texture here')
  })
})

describe('isGraphEnvelope', () => {
  it('knows a saved graph by its envelope, not by its file name', () => {
    expect(isGraphEnvelope({ app: 'wledtoy', formatVersion: 1, graph: { nodes: [], edges: [] } })).toBe(true)
    expect(isGraphEnvelope({ app: 'wledtoy', version: 3, fps: 30 })).toBe(false)
    expect(isGraphEnvelope({ app: 'other', formatVersion: 1, graph: {} })).toBe(false)
    expect(isGraphEnvelope(null)).toBe(false)
  })
})

describe('isConfigExport', () => {
  it('is an object this app exported, and not a graph file', () => {
    expect(isConfigExport({ app: 'wledtoy', version: 3, fps: 30 })).toBe(true)
    expect(isConfigExport({ app: 'wledtoy', formatVersion: 1, graph: {} })).toBe(false)
    expect(isConfigExport({ name: 'package' })).toBe(false)
    expect(isConfigExport([1, 2])).toBe(false)
    expect(isConfigExport(null)).toBe(false)
  })
})

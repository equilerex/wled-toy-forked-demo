/**
 * A block of GLSL functions a node needs. The compiler emits each chunk a graph uses once, after the
 * chunks it requires, so nodes never paste helpers inline and two nodes can share one.
 */
export interface GlslChunk {
  id: string
  requires: GlslChunk[]
  source: string
}

/** `chunks` and everything they require, each once, dependencies first. */
export function resolveChunks(chunks: Iterable<GlslChunk>): GlslChunk[] {
  const ordered: GlslChunk[] = []
  const visit = (chunk: GlslChunk) => {
    if (ordered.includes(chunk)) return
    chunk.requires.forEach(visit)
    ordered.push(chunk)
  }
  for (const chunk of chunks) visit(chunk)
  return ordered
}

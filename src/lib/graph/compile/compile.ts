// generateGlsl: compiles a graph into a shader plus the plan for what runs per frame on the CPU.
// Streams are settled first (./streams), per-frame nodes are planned (./control-plan), and nodes that run in the
// shader are emitted (./emit); this file only walks the graph's sinks and packs the result.
import type { OutputSettings } from '@/lib/engine/output'
import { itemFor } from '@/lib/graph/define/registry'
import type { GraphDoc } from '@/lib/graph/model/doc'
import { Compilation, GraphError, type CompileOptions, type FrozenValue, type GraphIssue } from './compilation'
import type { ControlPlan } from './control'
import { planControl } from './control-plan'
import { assemble, evaluate } from './emit'
import { resolveNode } from './streams'

export type { CompileOptions, FrozenValue, GraphIssue } from './compilation'

export interface GeneratedShader {
  code: string
  /** What runs on the CPU each frame, and which of its results the shader reads from `iControl`. */
  control: ControlPlan
  /** Wire settings from the graph's Output node; null when it has none. */
  output: OutputSettings | null
  error: string | null
  errorNode: string | null
  issues: GraphIssue[]
  /** Node id that emitted each line of `code`, indexed by 1-based line number. */
  lineNodes: (string | null)[]
  /** Standalone only: per-frame values with no GLSL of their own, written into the code as the number they had. */
  frozen: FrozenValue[]
}

export function generateGlsl(doc: GraphDoc, options: CompileOptions = {}): GeneratedShader {
  const c = new Compilation(doc, options)
  const finish = (error: string | null, errorNode: string | null): GeneratedShader =>
    ({ ...assemble(c), control: c.plan, output: c.output, error, errorNode, issues: c.issues, frozen: c.frozen })

  const sinks = doc.nodes.filter((n) => itemFor(n.data.kind) && c.lookup(n.id).item.isOutput)
  if (!sinks.some((n) => c.lookup(n.id).item.exec)) return finish('Add an Output node to see anything.', null)
  try {
    // a sink that only runs per frame (Scene Switch) or only settles streams (Audio Source) draws nothing, but takes part
    for (const sink of sinks) {
      const { item } = c.lookup(sink.id)
      if (item.exec) evaluate(c, sink.id)
      else if (item.run) planControl(c, sink.id)
      else resolveNode(c, sink.id)
    }
    return finish(null, null)
  } catch (e) {
    return finish((e as Error).message, e instanceof GraphError ? e.nodeId : null)
  }
}

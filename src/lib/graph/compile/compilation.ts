// What every compile stage reads and writes: the graph, the code being built, the per-frame plan, and the issues found.
import type { OutputSettings } from '@/lib/engine/output'
import type { ControlValue, InputSocket, NodeShape } from '@/lib/graph/define/node'
import { isImplicit, isLinkable } from '@/lib/graph/define/sockets'
import { itemFor } from '@/lib/graph/define/registry'
import type { Value } from '@/lib/graph/define/value'
import type { GraphDoc, GraphNodeData, StoredNode } from '@/lib/graph/model/doc'
import type { ControlPlan } from './control'
import type { GlslChunk } from './glsl/chunk'

export interface GraphIssue {
  nodeId: string | null
  message: string
}

export interface FrozenValue {
  nodeId: string
  title: string
  output: string
  value: string
}

export interface CompileOptions {
  /**
   * Compile for shader mode or an exported .glsl file, where nothing feeds the uniform block: every node with GLSL
   * runs in the shader, per-frame-only nodes use their `standalone` GLSL or are baked from `controls` as literals.
   */
  standalone?: boolean
  /** The last value a per-frame node produced, for baking. */
  controls?: (nodeId: string, output: string) => ControlValue | undefined
}

export class GraphError extends Error {
  constructor(message: string, readonly nodeId: string) {
    super(message)
  }
}

export const isGeneric = (socket: InputSocket) => isLinkable(socket) && socket.type.glsl === 'genType'

export class Compilation {
  readonly nodes: Map<string, StoredNode>
  readonly body: { text: string; node: string }[] = []
  readonly issues: GraphIssue[] = []
  readonly frozen: FrozenValue[] = []
  readonly chunks = new Set<GlslChunk>()
  readonly plan: ControlPlan = { steps: [], exports: [], resources: {} }
  output: OutputSettings | null = null
  /** Nodes on the current evaluation path, for loop detection. */
  readonly visiting = new Set<string>()

  // per stage, by node id: what ./streams settled
  readonly resolved = new Map<string, Record<string, unknown>>()
  readonly resolving = new Set<string>()
  // what ./control-plan decided
  readonly capable = new Map<string, boolean>()
  readonly steps = new Map<string, number>()
  readonly dims = new Map<string, Record<string, number>>()
  readonly exported = new Map<string, Value>()
  nextSlot = 0
  // what ./emit produced
  readonly emitted = new Map<string, Record<string, Value>>()

  private readonly incoming: Map<string, GraphDoc['edges'][number]>
  private readonly shapes = new Map<string, NodeShape>()

  constructor(readonly doc: GraphDoc, readonly options: CompileOptions) {
    this.nodes = new Map(doc.nodes.map((n) => [n.id, n]))
    this.incoming = new Map(doc.edges.map((e) => [`${e.target}:${e.targetHandle}`, e]))
  }

  get standalone() {
    return this.options.standalone === true
  }

  /** The node and the shape its values give it, settled once per node. */
  lookup(id: string): { node: StoredNode; item: NodeShape } {
    const node = this.nodes.get(id)!
    let item = this.shapes.get(id)
    if (!item) {
      const kind = itemFor(node.data.kind)
      if (!kind) throw new GraphError(`Unknown node type "${node.data.kind}"`, id)
      item = kind.shape(node.data.values)
      this.shapes.set(id, item)
    }
    return { node, item }
  }

  enter(id: string) {
    if (this.visiting.has(id)) throw new GraphError('The graph has a loop. Remove one of the links in the cycle.', id)
    this.visiting.add(id)
  }

  leave(id: string) {
    this.visiting.delete(id)
  }

  /** Where a socket's link comes from, when it has one and the source node exists. */
  sourceOf(nodeId: string, socket: InputSocket): { id: string; output: string } | undefined {
    const edge = this.incoming.get(`${nodeId}:${socket.name}`)
    return edge?.sourceHandle && this.nodes.has(edge.source) ? { id: edge.source, output: edge.sourceHandle } : undefined
  }

  /** The value stored on the node for a socket, or its default; an invalid value is reported and replaced. */
  storedValue(nodeId: string, data: GraphNodeData, socket: InputSocket): unknown {
    const raw = data.values[socket.name] ?? socket.default
    if (socket.type.check(raw)) return raw
    this.issues.push({ nodeId, message: `${socket.label || socket.type.label} is not valid; the default is used` })
    return isImplicit(socket.default) ? socket.type.initial() : socket.default
  }

  emit(nodeId: string, text: string) {
    this.body.push({ text, node: nodeId })
  }
}

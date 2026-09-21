// defineNode: turns a node definition (or a function of the node's values) into a registered node kind.
import type { InputDef, NodeItem, NodeItemOptions, NodeShape, OutputDef } from './node'
import { buildInputSocket, buildOutputSocket } from './sockets'

function toShape<I extends Record<string, InputDef>, O extends Record<string, OutputDef>, S>(
  id: string,
  { title, signature, isOutput, includes, input, output, exec, run, state, resolve, standalone }: NodeItemOptions<I, O, S>,
): NodeShape {
  if (!exec && !run && !resolve) throw new Error(`${id}: a node needs exec, run or resolve`)
  if (state && exec) throw new Error(`${id}: only a control-rate node can hold state; the shader has nowhere to keep it`)
  return {
    title,
    signature: signature ?? '',
    isOutput: isOutput ?? false,
    includes: includes ?? [],
    inputs: Object.entries(input).map(([name, def]) => buildInputSocket(id, name, def)),
    outputs: Object.entries(output).map(([name, def]) => buildOutputSocket(id, name, def)),
    exec: exec as NodeShape['exec'],
    run: run as NodeShape['run'],
    resolve: resolve as NodeShape['resolve'],
    state,
    standalone: (standalone ?? {}) as NodeShape['standalone'],
  }
}

/**
 * Defines a graph node: its sockets, how they are edited, and the GLSL it emits. Input order is the order rows appear
 * on the node. Given a function, the definition is rebuilt from the node's stored values whenever they change, so a
 * parameter can turn the node into a different shape.
 */
export function defineNode<const I extends Record<string, InputDef>, const O extends Record<string, OutputDef>, S = undefined>(
  id: string,
  definition: NodeItemOptions<I, O, S> | ((values: Record<string, any>) => NodeItemOptions<I, O, S>),
): NodeItem {
  const options = typeof definition === 'function' ? definition : () => definition
  const base = toShape(id, options({}))
  const { description, category } = options({})
  return {
    id, description, category, base,
    title: base.title,
    shape: typeof definition === 'function' ? (values) => toShape(id, options(values)) : () => base,
  }
}

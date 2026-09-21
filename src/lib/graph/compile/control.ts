import { CONTROL_VECTORS } from '@/lib/shader/glsl'
import type { ControlValue, FrameInfo, NodeShape } from '@/lib/graph/define/node'

/** Where a control step takes an input from: a value stored on the node, or an earlier step's output. */
export type ControlBinding = { constant: unknown } | { step: number; output: string } | { frame: (frame: FrameInfo) => number }

export interface ControlStep {
  nodeId: string
  kind: string
  run: NonNullable<NodeShape['run']>
  state?: NodeShape['state']
  inputs: Record<string, ControlBinding>
  /** Component count each linked input is cast to before `run` sees it. */
  dims: Record<string, number>
}

export interface ControlPlan {
  steps: ControlStep[]
  /** Step outputs the shader reads, and where in the uniform block they go. */
  exports: { step: number; output: string; slot: number; dim: number }[]
  /** What nodes registered while compiling, by kind: the audio source the graph wants, the analyses it reads. */
  resources: Record<string, unknown[]>
}

/** Same rules as castTo, on numbers: scalars spread, long vectors truncate, short ones pad with 0 and alpha 1. */
export function castControl(value: ControlValue, dim: number): ControlValue {
  if (!Array.isArray(value)) return dim === 1 ? value : Array(dim).fill(value)
  if (dim === 1) return value[0] ?? 0
  return Array.from({ length: dim }, (_, i) => value[i] ?? (i === 3 ? 1 : 0))
}

export const controlDim = (value: unknown) => (Array.isArray(value) ? value.length : 1)

/** Runs a plan once per frame and keeps each node's state across plans for as long as the node exists. */
export class ControlRunner {
  private plan: ControlPlan = { steps: [], exports: [], resources: {} }
  private states = new Map<string, unknown>()
  private readonly block = new Float32Array(CONTROL_VECTORS * 4)
  private results: Record<string, ControlValue>[] = []

  load(plan: ControlPlan) {
    const states = new Map<string, unknown>()
    for (const { nodeId, kind, state } of plan.steps) {
      const key = `${nodeId}:${kind}`
      if (state) states.set(key, this.states.get(key) ?? state())
    }
    this.states = states
    this.plan = plan
  }

  /** What a node put out on the last step, for the parts of the app that act on control values (scene recall). */
  output(nodeId: string, output: string): ControlValue | undefined {
    const index = this.plan.steps.findIndex((step) => step.nodeId === nodeId)
    return this.results[index]?.[output]
  }

  /** Forgets all state, e.g. when the clock is reset. */
  reset() {
    this.states.clear()
    this.load(this.plan)
  }

  step(frame: FrameInfo): Float32Array {
    const results: Record<string, ControlValue>[] = []
    this.results = results
    for (const { nodeId, kind, run, inputs, dims } of this.plan.steps) {
      const input = Object.fromEntries(Object.entries(inputs).map(([name, binding]) => {
        if ('constant' in binding) return [name, name in dims ? castControl(binding.constant as ControlValue, dims[name]) : binding.constant]
        if ('frame' in binding) return [name, castControl(binding.frame(frame), dims[name])]
        return [name, castControl(results[binding.step][binding.output] ?? 0, dims[name])]
      }))
      results.push(run(input, this.states.get(`${nodeId}:${kind}`), frame))
    }
    this.block.fill(0)
    for (const { step, output, slot, dim } of this.plan.exports) {
      const value = castControl(results[step][output] ?? 0, dim)
      const components = Array.isArray(value) ? value : [value]
      components.forEach((c, i) => (this.block[slot + i] = Number.isFinite(c) ? c : 0))
    }
    return this.block
  }
}

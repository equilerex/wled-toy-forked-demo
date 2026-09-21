import type { ComputedRef, InjectionKey } from 'vue'

/** Problems per node id (codegen issues and compile errors), provided by the graph page. */
export const graphIssuesKey: InjectionKey<ComputedRef<Map<string, string[]>>> = Symbol('graphIssues')

import { computed, ref } from 'vue'

/** Undo and redo over whole-document snapshots. Texts are compared, so recording an unchanged document does nothing. */
export function createHistory(initial: string, limit = 100) {
  const past = ref<string[]>([])
  const future = ref<string[]>([])
  let current = initial

  const step = (from: typeof past, to: typeof past) => {
    const next = from.value.pop()
    if (next === undefined) return null
    to.value.push(current)
    current = next
    return current
  }

  return {
    canUndo: computed(() => past.value.length > 0),
    canRedo: computed(() => future.value.length > 0),
    record(text: string) {
      if (text === current) return
      past.value.push(current)
      if (past.value.length > limit) past.value.shift()
      future.value = []
      current = text
    },
    undo: () => step(past, future),
    redo: () => step(future, past),
    reset(text: string) {
      past.value = []
      future.value = []
      current = text
    },
  }
}

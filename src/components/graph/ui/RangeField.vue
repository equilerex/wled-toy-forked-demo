<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'

const props = withDefaults(defineProps<{
  modelValue: number
  label?: string
  min?: number
  max?: number
  /** Shows steppers and sets their increment. */
  step?: number
  decimals?: number
}>(), { label: '', min: -Infinity, max: Infinity, step: undefined, decimals: 3 })
const emit = defineEmits<{
  'update:modelValue': [value: number]
  invalid: [invalid: boolean]
}>()

const editing = ref(false)
const pressed = ref(false)
const invalid = ref(false)
const text = ref('')
const input = ref<HTMLInputElement>()
let drag: { x: number; start: number; width: number; moved: boolean } | null = null

const bounded = computed(() => Number.isFinite(props.min) && Number.isFinite(props.max))
const display = computed(() => String(Number(props.modelValue.toFixed(props.decimals))))
const fill = computed(() => (bounded.value ? `${Math.min(1, Math.max(0, (props.modelValue - props.min) / (props.max - props.min))) * 100}%` : '0'))

function set(value: number) {
  const rounded = Number(value.toFixed(props.decimals))
  emit('update:modelValue', Math.min(props.max, Math.max(props.min, rounded)))
  setInvalid(false)
}

function setInvalid(next: boolean) {
  if (invalid.value === next) return
  invalid.value = next
  emit('invalid', next)
}

function onPointerDown(e: PointerEvent) {
  if (e.button !== 0) return
  const target = e.currentTarget as HTMLElement
  drag = { x: e.clientX, start: props.modelValue, width: target.getBoundingClientRect().width, moved: false }
  target.setPointerCapture(e.pointerId)
}

function onPointerMove(e: PointerEvent) {
  if (!drag) return
  const dx = e.clientX - drag.x
  if (!drag.moved && Math.abs(dx) < 3) return
  drag.moved = true
  pressed.value = true
  // a bounded field maps its width to its range; an unbounded one scales with magnitude so 2700 K and 0.05 both scrub well
  const perPixel = bounded.value ? (props.max - props.min) / drag.width : Math.max(0.005, Math.abs(drag.start) * 0.01)
  set(drag.start + dx * perPixel * (e.shiftKey ? 0.1 : 1))
}

async function onPointerUp(e: PointerEvent) {
  if (!drag) return
  const clicked = !drag.moved
  ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
  drag = null
  pressed.value = false
  if (!clicked) return
  editing.value = true
  text.value = display.value
  await nextTick()
  input.value?.select()
}

function commit() {
  // Enter and Escape unmount the input, which also fires blur; only the first one counts
  if (!editing.value) return
  editing.value = false
  const value = Number(text.value.trim())
  if (!text.value.trim() || !Number.isFinite(value)) setInvalid(true)
  else set(value)
}
</script>

<template>
  <div
    class="nui-field nodrag nowheel"
    :class="{ 'is-pressed': pressed, 'is-invalid': invalid }"
    role="spinbutton"
    :aria-label="label"
    :aria-valuenow="modelValue"
    :title="invalid ? 'Not a number. The last valid value is still used.' : undefined"
  >
    <input
      v-if="editing"
      ref="input"
      v-model="text"
      class="nui-input"
      spellcheck="false"
      @keydown.enter.prevent="commit"
      @keydown.esc.prevent="editing = false"
      @blur="commit"
    >
    <template v-else>
      <div class="nui-range-fill" :style="{ width: fill }" />
      <button v-if="step" type="button" class="nui-range-step is-down" tabindex="-1" aria-label="Decrease" @click="set(modelValue - step)">
        <svg viewBox="0 0 10 10"><path d="M2 0l6 5-6 5z" /></svg>
      </button>
      <div class="nui-range-text" @pointerdown="onPointerDown" @pointermove="onPointerMove" @pointerup="onPointerUp">
        <span class="nui-label">{{ label }}</span>
        <span class="nui-range-value">{{ display }}</span>
      </div>
      <button v-if="step" type="button" class="nui-range-step" tabindex="-1" aria-label="Increase" @click="set(modelValue + step)">
        <svg viewBox="0 0 10 10"><path d="M2 0l6 5-6 5z" /></svg>
      </button>
    </template>
  </div>
</template>

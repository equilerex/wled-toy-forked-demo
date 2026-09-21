<script setup lang="ts">
import { reactive } from 'vue'
import RangeField from './RangeField.vue'

const props = defineProps<{ modelValue: number[]; step?: number; min?: number; max?: number; decimals?: number }>()
const emit = defineEmits<{
  'update:modelValue': [value: number[]]
  invalid: [invalid: boolean]
}>()

const invalidAxes = reactive(new Set<number>())

function setComponent(index: number, value: number) {
  const next = [...props.modelValue]
  next[index] = value
  emit('update:modelValue', next)
}

function markInvalid(index: number, invalid: boolean) {
  const before = invalidAxes.size > 0
  if (invalid) invalidAxes.add(index)
  else invalidAxes.delete(index)
  if (before !== invalidAxes.size > 0) emit('invalid', !before)
}
</script>

<template>
  <div class="nui-vector">
    <RangeField
      v-for="(component, i) in modelValue"
      :key="i"
      :model-value="component"
      :label="'XYZW'[i]"
      :step="step"
      :min="min"
      :max="max"
      :decimals="decimals"
      @update:model-value="setComponent(i, $event)"
      @invalid="markInvalid(i, $event)"
    />
  </div>
</template>

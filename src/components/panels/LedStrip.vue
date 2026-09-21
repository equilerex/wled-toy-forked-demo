<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{ ledCount: number }>()
const canvas = ref<HTMLCanvasElement>()

// The bytes are PWM duty, which an LED turns into light linearly while a screen applies its own curve: shown raw, a strip
// at 10% looks nearly off here and clearly lit in the room. The monitor shows what the eye gets.
const SEEN = Uint8Array.from({ length: 256 }, (_, v) => Math.round(255 * (v / 255) ** (1 / 2.2)))

/** Draws a frame from ShaderRenderer.renderLeds (4 header bytes, then RGB triplets). */
function draw(frame: Uint8Array) {
  const el = canvas.value
  const ctx = el?.getContext('2d')
  if (!el || !ctx) return
  const w = Math.round(el.clientWidth * devicePixelRatio)
  const h = Math.round(el.clientHeight * devicePixelRatio)
  if (!w || !h) return
  if (el.width !== w || el.height !== h) {
    el.width = w
    el.height = h
  }
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, w, h)
  const n = Math.min(props.ledCount, (frame.length - 4) / 3)
  const cell = w / n
  const color = (i: number) => `rgb(${SEEN[frame[4 + i * 3]]},${SEEN[frame[5 + i * 3]]},${SEEN[frame[6 + i * 3]]})`
  if (cell < 4 * devicePixelRatio) {
    // too dense for single lights: one bar per LED, edge to edge
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = color(i)
      ctx.fillRect(Math.floor(cell * i), 0, Math.ceil(cell), h)
    }
    return
  }
  const width = cell * 0.78
  const height = Math.min(h * 0.6, width * 2.4)
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = ctx.shadowColor = color(i)
    ctx.shadowBlur = width
    ctx.beginPath()
    ctx.roundRect(cell * i + (cell - width) / 2, (h - height) / 2, width, height, width * 0.3)
    ctx.fill()
  }
  ctx.shadowBlur = 0
}

defineExpose({ draw })
</script>

<template>
  <canvas ref="canvas" class="led-monitor block h-12 w-full bg-black" />
</template>

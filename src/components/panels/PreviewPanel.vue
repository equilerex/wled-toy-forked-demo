<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import LedStrip from './LedStrip.vue'
import { useEngine } from '@/lib/engine/engine'
import { config } from '@/lib/app/config'
import { contextMenuItems } from '@/lib/app/commands'
import { layoutPositions } from '@/lib/engine/layout'

const menu = computed(() => contextMenuItems([['playback.resetTime', 'playback.toggleAudio', 'output.toggleStream']]))

const engine = useEngine()
const host = ref<HTMLDivElement>()
const strip = ref<InstanceType<typeof LedStrip>>()
let unsubscribe: (() => void) | undefined

// with a layout the LEDs are wherever it puts them; without one they sit on the scanline
const ledDots = computed(() => {
  if (!config.layout) return []
  const p = layoutPositions(config.layout)
  return Array.from({ length: p.length / 4 }, (_, i) => ({ x: p[i * 4] * 100, y: (1 - p[i * 4 + 1]) * 100 }))
})

const summary = computed(() => (config.layout
  ? config.layout.segments.map((s) => (s.kind === 'matrix' ? `matrix ${s.width}x${s.height}` : s.kind)).join(', ')
  : `y ${config.scanY.toFixed(2)}`))

onMounted(() => {
  host.value!.prepend(engine.canvas)
  unsubscribe = engine.onLedFrame((frame) => strip.value?.draw(frame))
})

onBeforeUnmount(() => unsubscribe?.())
</script>

<template>
  <UContextMenu :items="menu">
    <div class="preview-panel border-b border-(--app-hairline)">
      <div class="flex h-(--app-header-h) items-center gap-2 border-b border-(--app-hairline) bg-(--app-chrome) px-2.5 text-[12px]">
        <span class="font-medium text-highlighted">Preview</span>
        <span class="ms-auto truncate tabular-nums text-muted">{{ summary }}</span>
      </div>
      <div ref="host" class="relative overflow-hidden bg-black">
        <template v-if="config.layout">
          <span
            v-for="(dot, i) in ledDots"
            :key="i"
            class="pointer-events-none absolute size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-1 ring-white/80"
            :style="{ left: `${dot.x}%`, top: `${dot.y}%` }"
          />
        </template>
        <div v-else class="pointer-events-none absolute inset-x-0 h-px bg-white/70 shadow-[0_0_6px_white]" :style="{ top: `${(1 - config.scanY) * 100}%` }" />
      </div>
      <div class="led-pane mt-2 border-t border-(--app-hairline)">
        <div class="flex h-(--app-header-h) items-center gap-2 border-b border-(--app-hairline) bg-(--app-chrome) px-2.5 text-[12px]">
          <span class="font-medium text-highlighted">LED Strip</span>
          <span class="ms-auto tabular-nums text-muted">{{ config.ledCount }} LEDs</span>
        </div>
        <LedStrip ref="strip" :led-count="config.ledCount" />
      </div>
    </div>
  </UContextMenu>
</template>

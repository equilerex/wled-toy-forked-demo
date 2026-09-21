<script setup lang="ts">
import DocumentDialogs from '@/components/shell/DocumentDialogs.vue'
import type { GraphDocument } from '@/lib/graph/model/document'

defineProps<{ document: GraphDocument }>()
</script>

<template>
  <DocumentDialogs :document="document" />
</template>

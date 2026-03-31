<!-- src/typography/PretextBlock.vue -->
<template>
  <div
    class="pretext-block"
    :style="{ position: 'fixed', top: `${topY}px`, left: `${leftX}px`, zIndex: 2, pointerEvents: 'none' }"
  >
    <span
      v-for="(line, i) in lines"
      :key="i"
      class="pretext-line"
    >{{ line.text }}</span>
  </div>
</template>

<script setup lang="ts">
import type { LayoutLine } from './layout'

defineProps<{
  lines: LayoutLine[]
  topY: number
  leftX: number
}>()
</script>

<style scoped>
.pretext-line {
  display: block;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 14px;
  line-height: 28px;
  color: rgba(200, 192, 180, 0.75);
  white-space: nowrap;
  overflow: hidden;
}
</style>

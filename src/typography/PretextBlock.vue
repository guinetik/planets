<!-- src/typography/PretextBlock.vue -->
<template>
  <Transition name="prose-fade">
    <div
      v-if="lines.length > 0"
      class="pretext-block"
      :style="{ top: `${topY}px`, left: `${leftX}px` }"
    >
      <span
        v-for="(line, i) in lines"
        :key="i"
        class="pretext-line"
        :style="{ width: `${line.availableWidth}px` }"
      >{{ line.text }}</span>
    </div>
  </Transition>
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
.pretext-block {
  position: fixed;
  z-index: 2;
  pointer-events: none;
}
.pretext-line {
  display: block;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 26px;
  line-height: 46px;
  color: rgba(200, 192, 180, 0.75);
  white-space: nowrap;
  overflow: hidden;
  text-align: right;
}
.prose-fade-enter-active { transition: opacity 0.4s ease 0.6s; }
.prose-fade-leave-active { transition: opacity 0.3s ease; }
.prose-fade-enter-from, .prose-fade-leave-to { opacity: 0; }
</style>

<!-- src/typography/PretextBlock.vue -->
<template>
  <div
    v-if="lines.length > 0"
    class="pretext-block"
    :style="{ top: `${topY}px`, left: `${leftX}px` }"
  >
    <span
      v-for="(line, i) in lines"
      :key="i"
      class="pretext-line"
      :class="{ 'is-visible': visible }"
      :style="{
        width: `${line.availableWidth}px`,
        fontSize: `${fontSize}px`,
        lineHeight: `${lineHeight}px`,
        marginLeft: line.offsetX ? `${line.offsetX}px` : undefined,
        textAlign: line.centered ? 'center' : undefined,
        transitionDelay: visible
          ? `${i * 40}ms`
          : `${(lines.length - 1 - i) * 25}ms`,
      }"
    >{{ line.text }}</span>
  </div>
</template>

<script setup lang="ts">
import type { LayoutLine } from './layout'

defineProps<{
  lines: LayoutLine[]
  topY: number
  leftX: number
  fontSize: number
  lineHeight: number
  visible: boolean
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
  color: rgba(200, 192, 180, 0.75);
  white-space: nowrap;
  overflow: hidden;
  text-align: right;
  opacity: 0;
  transform: translateX(-20px);
  transition: opacity 0.35s ease, transform 0.35s ease;
}
.pretext-line.is-visible {
  opacity: 1;
  transform: translateX(0);
}

@media (max-width: 1024px) {
  .pretext-line {
    text-shadow:
      0 0 4px rgba(0, 0, 0, 0.9),
      0 0 8px rgba(0, 0, 0, 0.7),
      0 1px 2px rgba(0, 0, 0, 0.8);
    color: rgba(220, 215, 205, 0.85);
  }
}
</style>

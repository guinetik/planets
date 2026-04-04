<!-- src/typography/PretextBlock.vue -->
<template>
  <div
    v-if="lines.length > 0"
    class="pretext-block"
  >
    <div
      v-for="(line, i) in lines"
      :key="i"
      class="pretext-line-row"
      :class="{ 'is-visible': visible }"
      :style="{
        top: `${topY + i * lineHeight}px`,
        fontSize: `${fontSize}px`,
        lineHeight: `${lineHeight}px`,
        height: `${lineHeight}px`,
        transitionDelay: visible
          ? `${i * 40}ms`
          : `${(lines.length - 1 - i) * 25}ms`,
      }"
    >
      <span
        v-if="line.centered"
        class="pretext-fragment"
        :style="{
          left: `${leftX + (line.offsetX || 0)}px`,
          width: `${line.availableWidth}px`,
          textAlign: 'center',
        }"
      >{{ line.fragments[0]?.text }}</span>
      <span
        v-else
        v-for="(frag, fi) in line.fragments"
        :key="fi"
        class="pretext-fragment"
        :style="{
          left: `${frag.slotLeft}px`,
          width: `${frag.slotWidth}px`,
          textAlign: fragmentAlign(line, fi),
        }"
      >{{ frag.text }}</span>
    </div>
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

function fragmentAlign(line: LayoutLine, fragmentIndex: number): 'left' | 'right' | 'center' {
  // Single-fragment: right-align to hug the planet edge (same as before)
  if (line.fragments.length === 1) return 'right'
  // Multi-fragment: left fragment right-aligns (hugs moon from left),
  // right fragment left-aligns (hugs moon from right)
  if (fragmentIndex === 0) return 'right'
  if (fragmentIndex === line.fragments.length - 1) return 'left'
  return 'center'
}
</script>

<style scoped>
.pretext-block {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 2;
  pointer-events: none;
}
.pretext-line-row {
  position: absolute;
  left: 0;
  width: 100%;
  opacity: 0;
  transform: translateX(-20px);
  transition: opacity 0.35s ease, transform 0.35s ease;
}
.pretext-line-row.is-visible {
  opacity: 1;
  transform: translateX(0);
}
.pretext-fragment {
  position: absolute;
  font-family: Georgia, 'Times New Roman', serif;
  color: rgba(200, 192, 180, 0.75);
  white-space: nowrap;
  overflow: hidden;
}

@media (max-width: 1024px) {
  .pretext-fragment {
    text-shadow:
      0 0 4px rgba(0, 0, 0, 0.9),
      0 0 8px rgba(0, 0, 0, 0.7),
      0 1px 2px rgba(0, 0, 0, 0.8);
    color: rgba(220, 215, 205, 0.85);
  }
}
</style>

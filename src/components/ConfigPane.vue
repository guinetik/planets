<!-- src/components/ConfigPane.vue -->
<template>
  <div class="config-pane" v-if="visible">
    <label class="config-row">
      <span class="config-label">Orbits</span>
      <button
        class="config-toggle"
        :class="{ on: orbits }"
        @click="$emit('update:orbits', !orbits)"
      >
        <span class="config-toggle-knob" />
      </button>
    </label>
    <label class="config-row">
      <span class="config-label">Labels</span>
      <button
        class="config-toggle"
        :class="{ on: labels }"
        @click="$emit('update:labels', !labels)"
      >
        <span class="config-toggle-knob" />
      </button>
    </label>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  orbits: boolean
  labels: boolean
  visible: boolean
}>()
defineEmits<{
  'update:orbits': [value: boolean]
  'update:labels': [value: boolean]
}>()
</script>

<style scoped>
.config-pane {
  position: fixed;
  top: 72px;
  right: 48px;
  z-index: 4;
  display: flex;
  flex-direction: column;
  gap: 0.4vw;
}
.config-row {
  display: flex;
  align-items: center;
  gap: 0.5vw;
  cursor: pointer;
}
.config-label {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 0.42vw;
  letter-spacing: 0.12vw;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.3);
}
.config-toggle {
  position: relative;
  width: 1.6vw;
  height: 0.7vw;
  border-radius: 0.35vw;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  padding: 0;
  transition: background 0.2s ease, border-color 0.2s ease;
}
.config-toggle.on {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.25);
}
.config-toggle-knob {
  position: absolute;
  top: 50%;
  left: 0.1vw;
  width: 0.44vw;
  height: 0.44vw;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.35);
  transform: translateY(-50%);
  transition: left 0.2s ease, background 0.2s ease;
}
.config-toggle.on .config-toggle-knob {
  left: calc(100% - 0.54vw);
  background: rgba(255, 255, 255, 0.7);
}

@media (max-width: 1024px) {
  .config-pane {
    top: 52px;
    right: 20px;
  }
  .config-label {
    font-size: 2.4vw;
  }
  .config-toggle {
    width: 10vw;
    height: 5vw;
    border-radius: 2.5vw;
  }
  .config-toggle-knob {
    width: 3.5vw;
    height: 3.5vw;
    left: 0.6vw;
  }
  .config-toggle.on .config-toggle-knob {
    left: calc(100% - 4.1vw);
  }
}
</style>

<template>
  <div class="mb-4 text-6xl leading-none">
    <span>{{ emoji }}</span>
  </div>
</template>

<script setup>
defineProps({
  emoji: {
    type: String,
    default: '📄',
  },
})
</script>

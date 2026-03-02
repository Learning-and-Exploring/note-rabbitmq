<template>
  <div class="flex flex-wrap items-center gap-3 text-sm text-gray-500">
    <span>Last edited {{ editedAt }}</span>
    <span class="text-gray-300">•</span>
    <span>By {{ author }}</span>
  </div>
</template>

<script setup>
defineProps({
  editedAt: {
    type: String,
    default: 'today',
  },
  author: {
    type: String,
    default: 'System',
  },
})
</script>

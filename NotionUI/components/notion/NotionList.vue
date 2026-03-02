<template>
  <ul class="list-disc pl-6 space-y-2">
    <li v-for="(item, index) in items" :key="`${item}-${index}`">
      {{ item }}
    </li>
  </ul>
</template>

<script setup>
defineProps({
  items: {
    type: Array,
    default: () => [],
  },
})
</script>

<template>
  <button 
    :class="[
      'px-3 py-1 rounded transition text-xs font-medium',
      variant === 'primary' ? 'bg-[#2383e2] text-white' : 'hover:bg-gray-100'
    ]"
  >
    <slot />
  </button>
</template>

<script setup>
defineProps({
  variant: { default: 'primary' }
})
</script>
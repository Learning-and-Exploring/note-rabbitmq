<script setup>
import { computed } from 'vue'

const props = defineProps({
  variant: {
    type: String,
    default: 'primary',
  },
  size: {
    type: String,
    default: 'sm',
  },
  type: {
    type: String,
    default: 'button',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
})

const variantClass = computed(() => {
  if (props.variant === 'secondary') {
    return 'bg-neutral-100 text-neutral-800 hover:bg-neutral-200'
  }

  if (props.variant === 'ghost') {
    return 'bg-white text-neutral-900 hover:bg-neutral-50 border border-neutral-200'
  }

  return 'bg-blue-600 text-white hover:bg-blue-700'
})

const sizeClass = computed(() => {
  if (props.size === 'md') {
    return 'px-4 py-2.5 text-sm'
  }

  return 'px-3 py-2 text-xs'
})
</script>

<template>
  <button
    :type="type"
    :disabled="disabled"
    class="inline-flex items-center justify-center rounded-lg font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
    :class="[variantClass, sizeClass]"
  >
    <slot />
  </button>
</template>

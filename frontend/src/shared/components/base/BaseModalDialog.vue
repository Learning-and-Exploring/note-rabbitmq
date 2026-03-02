<script setup>
import BaseButton from '@/shared/components/base/BaseButton.vue'

defineProps({
  open: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    default: '',
  },
  description: {
    type: String,
    default: '',
  },
  maxWidthClass: {
    type: String,
    default: 'max-w-md',
  },
})

defineEmits(['close'])
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    @click.self="$emit('close')"
  >
    <div class="w-full rounded-xl bg-white p-5 shadow-xl" :class="maxWidthClass">
      <h3 v-if="title" class="text-base font-semibold text-neutral-900">{{ title }}</h3>
      <p v-if="description" class="mt-2 text-sm text-neutral-600">{{ description }}</p>

      <div v-if="$slots.default" class="mt-3">
        <slot />
      </div>

      <div class="mt-5 flex flex-wrap justify-end gap-2">
        <slot name="actions">
          <BaseButton variant="secondary" @click="$emit('close')">Close</BaseButton>
        </slot>
      </div>
    </div>
  </div>
</template>

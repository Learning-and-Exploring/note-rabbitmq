<script setup>
import { onBeforeUnmount, watch } from 'vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'

const props = defineProps({
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

let originalBodyOverflow = ''
let originalBodyPaddingRight = ''
let lockCount = 0

function getScrollbarWidth() {
  if (typeof window === 'undefined') return 0
  return Math.max(0, window.innerWidth - document.documentElement.clientWidth)
}

function lockBodyScroll() {
  if (typeof document === 'undefined') return
  if (lockCount === 0) {
    originalBodyOverflow = document.body.style.overflow
    originalBodyPaddingRight = document.body.style.paddingRight
    const scrollbarWidth = getScrollbarWidth()
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`
    }
    document.body.style.overflow = 'hidden'
  }
  lockCount += 1
}

function unlockBodyScroll() {
  if (typeof document === 'undefined') return
  if (lockCount <= 0) return
  lockCount -= 1
  if (lockCount === 0) {
    document.body.style.overflow = originalBodyOverflow
    document.body.style.paddingRight = originalBodyPaddingRight
  }
}

watch(
  () => props.open,
  (isOpen, wasOpen) => {
    if (isOpen && !wasOpen) {
      lockBodyScroll()
      return
    }

    if (!isOpen && wasOpen) {
      unlockBodyScroll()
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  if (props.open) {
    unlockBodyScroll()
  }
})
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    @click.self="$emit('close')"
  >
    <div class="w-full max-h-[85vh] overflow-y-auto rounded-xl bg-white p-5 shadow-xl" :class="maxWidthClass">
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

<template>
  <nav class="flex items-center justify-between px-5 py-3 text-sm border-b border-gray-100">
    <div class="flex items-center gap-2">
      <span class="opacity-50">🏠 Workspace</span>
      <span class="opacity-30">/</span>
      <span class="font-semibold">{{ title }}</span>
    </div>
    <div class="flex items-center gap-4">
      <UiBaseButton variant="secondary">+ New Page</UiBaseButton>
      <UiBaseButton>Share</UiBaseButton>
      <div class="w-7 h-7 bg-orange-200 rounded-full flex items-center justify-center text-[10px] font-bold">SC</div>
    </div>
  </nav>
</template>

<script setup>
defineProps(['title'])
</script>
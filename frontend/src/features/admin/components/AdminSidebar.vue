<script setup>
import BaseButton from '@/shared/components/base/BaseButton.vue'

defineProps({
  workspaceName: {
    type: String,
    default: '',
  },
  navActive: {
    type: String,
    required: true,
  },
})

const emit = defineEmits(['select-tab', 'logout'])

function selectTab(tab) {
  emit('select-tab', tab)
}
</script>

<template>
  <aside class="h-screen border-r border-slate-200 bg-white px-6 py-6">
    <div class="flex items-center gap-3">
      <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-sm font-semibold text-white">A</div>
      <div class="min-w-0">
        <p class="truncate text-base font-semibold text-slate-900">{{ workspaceName || 'Workspace' }}</p>
        <p class="text-xs text-slate-500">Admin Dashboard</p>
      </div>
    </div>

    <nav class="mt-8 space-y-1">
      <button
        type="button"
        class="w-full rounded-lg px-3 py-2 text-left text-sm font-medium"
        :class="navActive === 'overview' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'"
        @click="selectTab('overview')"
      >
        Overview
      </button>
      <button
        type="button"
        class="w-full rounded-lg px-3 py-2 text-left text-sm font-medium"
        :class="navActive === 'members' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'"
        @click="selectTab('members')"
      >
        Members
      </button>
      <button
        type="button"
        class="w-full rounded-lg px-3 py-2 text-left text-sm font-medium"
        :class="navActive === 'settings' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'"
        @click="selectTab('settings')"
      >
        Settings
      </button>
      <button
        type="button"
        class="w-full rounded-lg px-3 py-2 text-left text-sm font-medium"
        :class="navActive === 'billing' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'"
        @click="selectTab('billing')"
      >
        Billing
      </button>
      <button
        type="button"
        class="w-full rounded-lg px-3 py-2 text-left text-sm font-medium"
        :class="navActive === 'security' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'"
        @click="selectTab('security')"
      >
        Security
      </button>
      <button
        type="button"
        class="w-full rounded-lg px-3 py-2 text-left text-sm font-medium"
        :class="navActive === 'help' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'"
        @click="selectTab('help')"
      >
        Help Center
      </button>
    </nav>

    <div class="mt-8 border-t border-slate-200 pt-4">
      <BaseButton variant="secondary" class="w-full" @click="$emit('logout')">Logout</BaseButton>
    </div>
  </aside>
</template>

<script setup>
import BaseButton from '@/shared/components/base/BaseButton.vue'

defineProps({
  workspaceName: {
    type: String,
    default: '',
  },
  workspaceLoading: {
    type: Boolean,
    required: true,
  },
  workspaceSaving: {
    type: Boolean,
    required: true,
  },
  workspaceStatus: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['update:workspaceName', 'save'])
</script>

<template>
  <section class="rounded-xl border border-slate-200 bg-white p-6">
    <div class="max-w-xl">
      <label class="block text-sm font-medium text-slate-700">Workspace Name</label>
      <input
        :value="workspaceName"
        :disabled="workspaceLoading || workspaceSaving"
        type="text"
        class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800"
        placeholder="Enter workspace name"
        @input="emit('update:workspaceName', $event.target.value)"
      />
      <div class="mt-3 flex items-center justify-between gap-3">
        <p class="text-sm text-slate-500">{{ workspaceStatus || 'Name appears in the admin sidebar.' }}</p>
        <BaseButton :disabled="workspaceLoading || workspaceSaving" @click="emit('save')">
          {{ workspaceSaving ? 'Saving...' : 'Save' }}
        </BaseButton>
      </div>
    </div>
  </section>
</template>

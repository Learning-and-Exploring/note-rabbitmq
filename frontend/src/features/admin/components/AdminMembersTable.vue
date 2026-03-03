<script setup>
import BaseButton from '@/shared/components/base/BaseButton.vue'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

defineProps({
  limit: {
    type: Number,
    required: true,
  },
  loadingUsers: {
    type: Boolean,
    required: true,
  },
  membersStatus: {
    type: String,
    default: '',
  },
  filteredUsers: {
    type: Array,
    default: () => [],
  },
  detailLoading: {
    type: Boolean,
    required: true,
  },
  viewingUserId: {
    type: String,
    default: '',
  },
  deletingUserId: {
    type: String,
    default: '',
  },
  currentUserId: {
    type: String,
    default: '',
  },
  page: {
    type: Number,
    required: true,
  },
  totalPages: {
    type: Number,
    required: true,
  },
  canPrevPage: {
    type: Boolean,
    required: true,
  },
  canNextPage: {
    type: Boolean,
    required: true,
  },
  formatRelativeTime: {
    type: Function,
    required: true,
  },
  roleLabel: {
    type: Function,
    required: true,
  },
  getInitials: {
    type: Function,
    required: true,
  },
})

const emit = defineEmits([
  'update:limit',
  'limit-change',
  'reload',
  'add-member',
  'view-user',
  'delete-user',
  'prev-page',
  'next-page',
])

function handleLimitUpdate(value) {
  const next = Number(value)
  if (!Number.isFinite(next)) return
  emit('update:limit', next)
  emit('limit-change')
}
</script>

<template>
  <section class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3">
      <div class="flex flex-wrap items-center gap-2">
        <label class="inline-flex items-center gap-2 text-sm text-slate-600">
          Per page
          <Select :model-value="String(limit)" :disabled="loadingUsers" @update:model-value="handleLimitUpdate">
            <SelectTrigger class="h-8 w-[84px] border-slate-200 bg-white text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </label>
        <BaseButton variant="secondary" :disabled="loadingUsers" @click="emit('reload')">Reload</BaseButton>
        <BaseButton @click="emit('add-member')">Add Member</BaseButton>
      </div>
      <p class="text-sm text-slate-500">{{ membersStatus }}</p>
    </div>

    <div class="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table class="min-w-full text-sm">
        <thead class="bg-slate-50 text-left">
          <tr>
            <th class="px-5 py-3 font-medium text-slate-500">User</th>
            <th class="px-5 py-3 font-medium text-slate-500">Role</th>
            <th class="px-5 py-3 font-medium text-slate-500">Email Verified</th>
            <th class="px-5 py-3 font-medium text-slate-500">Updated</th>
            <th class="px-5 py-3 text-right font-medium text-slate-500">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-for="user in filteredUsers" :key="user.id">
            <td class="px-5 py-3">
              <div class="flex items-center gap-3">
                <div class="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700">
                  {{ getInitials(user) }}
                </div>
                <div class="min-w-0">
                  <p class="truncate font-medium text-slate-900">{{ user.name || 'Unnamed' }}</p>
                  <p class="truncate text-slate-500">{{ user.email }}</p>
                </div>
              </div>
            </td>
            <td class="px-5 py-3 text-slate-600">{{ roleLabel(user.role) }}</td>
            <td class="px-5 py-3 text-slate-600">{{ user.isEmailVerified ? 'Yes' : 'No' }}</td>
            <td class="px-5 py-3 text-slate-600">{{ formatRelativeTime(user.updatedAt || user.createdAt) }}</td>
            <td class="px-5 py-3">
              <div class="flex justify-end gap-2">
                <BaseButton
                  variant="secondary"
                  :disabled="detailLoading && viewingUserId === user.id"
                  @click="emit('view-user', user)"
                >
                  View
                </BaseButton>
                <BaseButton
                  variant="ghost"
                  class="border-red-200 text-red-600 hover:bg-red-50"
                  :disabled="deletingUserId === user.id || user.id === currentUserId"
                  @click="emit('delete-user', user)"
                >
                  {{ deletingUserId === user.id ? 'Deleting...' : 'Delete' }}
                </BaseButton>
              </div>
            </td>
          </tr>
          <tr v-if="!loadingUsers && filteredUsers.length === 0">
            <td colspan="5" class="px-5 py-8 text-center text-slate-500">No members found</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-2">
      <p class="text-xs text-slate-500">Page {{ page }} of {{ totalPages }}</p>
      <div class="flex items-center gap-2">
        <BaseButton variant="secondary" :disabled="!canPrevPage" @click="emit('prev-page')">Previous</BaseButton>
        <BaseButton variant="secondary" :disabled="!canNextPage" @click="emit('next-page')">Next</BaseButton>
      </div>
    </div>
  </section>
</template>

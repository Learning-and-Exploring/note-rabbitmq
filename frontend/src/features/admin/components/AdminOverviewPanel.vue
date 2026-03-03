<script setup>
import BaseButton from '@/shared/components/base/BaseButton.vue'

defineProps({
  totalMembersDisplay: {
    type: String,
    required: true,
  },
  activePagesEstimate: {
    type: String,
    required: true,
  },
  storageUsedGb: {
    type: Number,
    required: true,
  },
  storageLimitGb: {
    type: Number,
    required: true,
  },
  storagePercent: {
    type: Number,
    required: true,
  },
  recentUsers: {
    type: Array,
    default: () => [],
  },
  formatRelativeTime: {
    type: Function,
    required: true,
  },
  roleLabel: {
    type: Function,
    required: true,
  },
})

const emit = defineEmits(['manage-members', 'view-user'])
</script>

<template>
  <section class="space-y-6">
    <div class="grid gap-4 md:grid-cols-3">
      <article class="rounded-xl border border-slate-200 bg-white p-5">
        <p class="text-sm text-slate-500">Total Members</p>
        <p class="mt-2 text-3xl font-semibold text-slate-900">{{ totalMembersDisplay }}</p>
      </article>
      <article class="rounded-xl border border-slate-200 bg-white p-5">
        <p class="text-sm text-slate-500">Active (7 days)</p>
        <p class="mt-2 text-3xl font-semibold text-slate-900">{{ activePagesEstimate }}</p>
      </article>
      <article class="rounded-xl border border-slate-200 bg-white p-5">
        <p class="text-sm text-slate-500">Storage</p>
        <p class="mt-2 text-2xl font-semibold text-slate-900">{{ storageUsedGb }} GB / {{ storageLimitGb }} GB</p>
        <div class="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
          <div class="h-full rounded-full bg-blue-600" :style="{ width: `${storagePercent}%` }" />
        </div>
      </article>
    </div>

    <article class="rounded-xl border border-slate-200 bg-white">
      <div class="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <h2 class="text-lg font-semibold text-slate-900">Recent Members</h2>
        <BaseButton variant="secondary" @click="emit('manage-members')">Manage</BaseButton>
      </div>
      <div class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead class="bg-slate-50 text-left text-slate-500">
            <tr>
              <th class="px-5 py-3 font-medium">Name</th>
              <th class="px-5 py-3 font-medium">Email</th>
              <th class="px-5 py-3 font-medium">Role</th>
              <th class="px-5 py-3 font-medium">Updated</th>
              <th class="px-5 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="user in recentUsers" :key="user.id">
              <td class="px-5 py-3 text-slate-900">{{ user.name || 'Unnamed' }}</td>
              <td class="px-5 py-3 text-slate-600">{{ user.email }}</td>
              <td class="px-5 py-3 text-slate-600">{{ roleLabel(user.role) }}</td>
              <td class="px-5 py-3 text-slate-600">{{ formatRelativeTime(user.updatedAt || user.createdAt) }}</td>
              <td class="px-5 py-3 text-right">
                <BaseButton variant="secondary" @click="emit('view-user', user)">View</BaseButton>
              </td>
            </tr>
            <tr v-if="recentUsers.length === 0">
              <td colspan="5" class="px-5 py-8 text-center text-slate-500">No members found</td>
            </tr>
          </tbody>
        </table>
      </div>
    </article>
  </section>
</template>

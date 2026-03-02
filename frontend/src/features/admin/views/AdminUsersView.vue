<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import BaseModalDialog from '@/shared/components/base/BaseModalDialog.vue'
import { useAuth } from '@/features/auth/composables/useAuth'

const router = useRouter()
const { currentUser, isAuthenticated, isAdmin, restoreSession, getAccessToken } = useAuth()

const users = ref([])
const loading = ref(false)
const status = ref('')
const deletingUserId = ref('')
const pendingDeleteUser = ref(null)

const currentUserId = computed(() => currentUser.value?.id || '')

async function fetchUsers() {
  loading.value = true
  status.value = 'Loading users...'

  try {
    const token = getAccessToken()
    const res = await fetch('/api/users', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    const payload = await res.json()
    if (!res.ok) {
      status.value = payload.message || 'Failed to load users'
      return
    }

    users.value = Array.isArray(payload.data) ? payload.data : []
    status.value = `Loaded ${users.value.length} users`
    console.log(users);
    
  } catch {
    status.value = 'Failed to load users'
  } finally {
    loading.value = false
  }
}

function openDeleteDialog(user) {
  if (!user || !user.id || user.id === currentUserId.value) {
    status.value = 'You cannot delete your own account from admin.'
    return
  }
  pendingDeleteUser.value = user
}

function closeDeleteDialog() {
  pendingDeleteUser.value = null
}

async function confirmDeleteUser() {
  const userId = pendingDeleteUser.value?.id
  if (!userId || userId === currentUserId.value) {
    status.value = 'You cannot delete your own account from admin.'
    closeDeleteDialog()
    return
  }

  deletingUserId.value = userId
  closeDeleteDialog()
  status.value = 'Deleting user...'

  try {
    const token = getAccessToken()
    const res = await fetch(`/api/users/${userId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}))
      status.value = payload.message || 'Failed to delete user'
      return
    }

    users.value = users.value.filter((user) => user.id !== userId)
    status.value = 'User deleted'
  } catch {
    status.value = 'Failed to delete user'
  } finally {
    deletingUserId.value = ''
  }
}

onMounted(async () => {
  await restoreSession()

  if (!isAuthenticated.value) {
    router.replace('/login')
    return
  }

  if (!isAdmin.value) {
    router.replace('/notes')
    return
  }

  fetchUsers()
})
</script>

<template>
  <main class="mx-auto w-full max-w-5xl p-5">
    <section class="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 class="text-xl font-semibold text-neutral-900">Admin Users</h1>
          <p class="text-sm text-neutral-500">Manage user accounts</p>
        </div>
        <div class="flex gap-2">
          <BaseButton variant="secondary" :disabled="loading" @click="fetchUsers">Reload</BaseButton>
        </div>
      </div>

      <p class="mt-4 text-sm text-neutral-600">{{ status }}</p>

      <div class="mt-4 overflow-x-auto rounded-xl border border-neutral-200">
        <table class="min-w-full divide-y divide-neutral-200 text-sm">
          <thead class="bg-neutral-50">
            <tr>
              <th class="px-4 py-3 text-left font-semibold text-neutral-700">Name</th>
              <th class="px-4 py-3 text-left font-semibold text-neutral-700">Email</th>
              <th class="px-4 py-3 text-left font-semibold text-neutral-700">Role</th>
              <th class="px-4 py-3 text-left font-semibold text-neutral-700">Verified</th>
              <th class="px-4 py-3 text-left font-semibold text-neutral-700">Created</th>
              <th class="px-4 py-3 text-right font-semibold text-neutral-700">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-neutral-100 bg-white">
            <tr v-for="user in users" :key="user.id">
              <td class="px-4 py-3 text-neutral-800">{{ user.name || 'Unnamed User' }}</td>
              <td class="px-4 py-3 text-neutral-700">{{ user.email }}</td>
              <td class="px-4 py-3 text-neutral-700">
                <span
                  class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold"
                  :class="user.role === 'ADMIN' ? 'bg-blue-100 text-blue-700' : 'bg-neutral-100 text-neutral-700'"
                >
                  {{ user.role || 'USER' }}
                </span>
              </td>
              <td class="px-4 py-3 text-neutral-700">{{ user.isEmailVerified ? 'Yes' : 'No' }}</td>
              <td class="px-4 py-3 text-neutral-700">{{ new Date(user.createdAt).toLocaleString() }}</td>
              <td class="px-4 py-3 text-right">
                <BaseButton
                  variant="ghost"
                  class="border-red-200 text-red-600 hover:bg-red-50"
                  :disabled="deletingUserId === user.id || user.id === currentUserId"
                  @click="openDeleteDialog(user)"
                >
                  {{ deletingUserId === user.id ? 'Deleting...' : 'Delete' }}
                </BaseButton>
              </td>
            </tr>
            <tr v-if="!loading && users.length === 0">
              <td colspan="6" class="px-4 py-6 text-center text-neutral-500">No users found</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </main>

  <BaseModalDialog
    :open="Boolean(pendingDeleteUser)"
    title="Delete user account?"
    description="This action cannot be undone."
    @close="closeDeleteDialog"
  >
    <p class="truncate text-sm text-neutral-700">
      {{ pendingDeleteUser?.name || pendingDeleteUser?.email || 'Selected user' }}
    </p>
    <template #actions>
      <BaseButton variant="secondary" @click="closeDeleteDialog">Cancel</BaseButton>
      <BaseButton class="bg-red-600 hover:bg-red-700" :disabled="Boolean(deletingUserId)" @click="confirmDeleteUser">
        Delete
      </BaseButton>
    </template>
  </BaseModalDialog>
</template>

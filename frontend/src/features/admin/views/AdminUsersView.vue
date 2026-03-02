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
const page = ref(1)
const limit = ref(10)
const totalUsers = ref(0)
const totalPages = ref(1)
const deletingUserId = ref('')
const pendingDeleteUser = ref(null)
const viewingUserId = ref('')
const detailLoading = ref(false)
const detailStatus = ref('')
const selectedUserDetail = ref(null)

const currentUserId = computed(() => currentUser.value?.id || '')
const canPrevPage = computed(() => page.value > 1 && !loading.value)
const canNextPage = computed(() => page.value < totalPages.value && !loading.value)

async function fetchUsers(requestedPage = page.value) {
  loading.value = true
  status.value = 'Loading users...'

  try {
    const token = getAccessToken()
    const safePage = Math.max(1, Number(requestedPage) || 1)
    const params = new URLSearchParams({
      page: String(safePage),
      limit: String(limit.value),
    })
    const res = await fetch(`/api/users?${params.toString()}`, {
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
    const pagination = payload.pagination || {}
    page.value = Number(pagination.page) || safePage
    limit.value = Number(pagination.limit) || limit.value
    totalUsers.value = Number(pagination.total) || users.value.length
    totalPages.value = Math.max(1, Number(pagination.totalPages) || 1)

    if (totalUsers.value === 0) {
      status.value = 'No users found'
      return
    }

    const start = (page.value - 1) * limit.value + 1
    const end = Math.min(page.value * limit.value, totalUsers.value)
    status.value = `Showing ${start}-${end} of ${totalUsers.value} users`
  } catch {
    status.value = 'Failed to load users'
  } finally {
    loading.value = false
  }
}

async function goToPage(nextPage) {
  if (loading.value) return
  if (nextPage < 1 || nextPage > totalPages.value) return
  await fetchUsers(nextPage)
}

async function onLimitChange() {
  page.value = 1
  await fetchUsers(1)
}

function formatDate(value) {
  if (!value) return 'N/A'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'N/A'
  return date.toLocaleString()
}

function closeDetailsDialog() {
  if (detailLoading.value) return
  viewingUserId.value = ''
  detailStatus.value = ''
  selectedUserDetail.value = null
}

async function openDetailsDialog(user) {
  if (!user?.id) return

  viewingUserId.value = user.id
  detailLoading.value = true
  detailStatus.value = 'Loading user details...'
  selectedUserDetail.value = null

  try {
    const token = getAccessToken()
    const res = await fetch(`/api/users/${user.id}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    const payload = await res.json().catch(() => ({}))
    if (!res.ok) {
      detailStatus.value = payload.message || 'Failed to load user details'
      return
    }

    selectedUserDetail.value = payload.data || null
    detailStatus.value = ''
  } catch {
    detailStatus.value = 'Failed to load user details'
  } finally {
    detailLoading.value = false
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

    await fetchUsers(page.value)
    if (users.value.length === 0 && page.value > 1) {
      await fetchUsers(page.value - 1)
    }
    status.value = `User deleted. ${status.value}`
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
        <div class="flex flex-wrap items-center gap-2">
          <label class="inline-flex items-center gap-2 text-xs font-medium text-neutral-600">
            Per page
            <select
              v-model.number="limit"
              class="rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs text-neutral-700"
              :disabled="loading"
              @change="onLimitChange"
            >
              <option :value="5">5</option>
              <option :value="10">10</option>
              <option :value="20">20</option>
              <option :value="50">50</option>
            </select>
          </label>
          <BaseButton variant="secondary" :disabled="loading" @click="fetchUsers(page)">Reload</BaseButton>
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
              <td class="px-4 py-3 text-neutral-800">{{ user.name || 'Unnamed' }}</td>
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
              <td class="px-4 py-3 text-neutral-700">{{ formatDate(user.createdAt) }}</td>
              <td class="px-4 py-3 text-right">
                <div class="flex justify-end gap-2">
                  <BaseButton
                    variant="secondary"
                    class="min-w-20"
                    :disabled="detailLoading && viewingUserId === user.id"
                    @click="openDetailsDialog(user)"
                  >
                    View
                  </BaseButton>
                  <BaseButton
                    variant="ghost"
                    class="border-red-200 text-red-600 hover:bg-red-50"
                    :disabled="deletingUserId === user.id || user.id === currentUserId"
                    @click="openDeleteDialog(user)"
                  >
                    {{ deletingUserId === user.id ? 'Deleting...' : 'Delete' }}
                  </BaseButton>
                </div>
              </td>
            </tr>
            <tr v-if="!loading && users.length === 0">
              <td colspan="6" class="px-4 py-6 text-center text-neutral-500">No users found</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="mt-4 flex flex-wrap items-center justify-between gap-2">
        <p class="text-xs text-neutral-500">Page {{ page }} of {{ totalPages }}</p>
        <div class="flex items-center gap-2">
          <BaseButton variant="secondary" :disabled="!canPrevPage" @click="goToPage(page - 1)">Previous</BaseButton>
          <BaseButton variant="secondary" :disabled="!canNextPage" @click="goToPage(page + 1)">Next</BaseButton>
        </div>
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

  <BaseModalDialog
    :open="Boolean(viewingUserId)"
    title="User details"
    :description="selectedUserDetail?.email || 'Inspect account details'"
    max-width-class="max-w-lg"
    @close="closeDetailsDialog"
  >
    <div class="min-h-[280px]">
      <p v-if="detailStatus" class="text-sm text-neutral-600">{{ detailStatus }}</p>
      <div v-else-if="selectedUserDetail" class="grid gap-3 text-sm text-neutral-700">
        <div class="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
          <p class="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Name</p>
          <p class="mt-1 text-neutral-900">{{ selectedUserDetail.name || 'Unnamed' }}</p>
        </div>
        <div class="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
          <p class="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Role</p>
          <p class="mt-1 text-neutral-900">{{ selectedUserDetail.role || 'USER' }}</p>
        </div>
        <div class="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
          <p class="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Email Verified</p>
          <p class="mt-1 text-neutral-900">{{ selectedUserDetail.isEmailVerified ? 'Yes' : 'No' }}</p>
        </div>
        <div class="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
          <p class="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Created At</p>
          <p class="mt-1 text-neutral-900">{{ formatDate(selectedUserDetail.createdAt) }}</p>
        </div>
        <div class="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
          <p class="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Updated At</p>
          <p class="mt-1 text-neutral-900">{{ formatDate(selectedUserDetail.updatedAt) }}</p>
        </div>
        <div class="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
          <p class="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">User ID</p>
          <p class="mt-1 break-all font-mono text-xs text-neutral-800">{{ selectedUserDetail.id }}</p>
        </div>
      </div>
    </div>

    <template #actions>
      <BaseButton variant="secondary" :disabled="detailLoading" @click="closeDetailsDialog">Close</BaseButton>
    </template>
  </BaseModalDialog>
</template>

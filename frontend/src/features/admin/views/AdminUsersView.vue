<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import BaseModalDialog from '@/shared/components/base/BaseModalDialog.vue'
import { useAuth } from '@/features/auth/composables/useAuth'
import { http, isErrorStatus } from '@/lib/http'

const router = useRouter()
const { currentUser, isAuthenticated, isAdmin, restoreSession, getAccessToken, logout } = useAuth()

const navActive = ref('overview')
const searchQuery = ref('')

const users = ref([])
const loadingUsers = ref(false)
const membersStatus = ref('')
const page = ref(1)
const limit = ref(10)
const totalUsers = ref(0)
const totalPages = ref(1)

const summary = ref({
  totalMembers: 0,
  activePages: 0,
  storageUsedGb: 0,
  storageLimitGb: 50,
  storagePercent: 0,
})

const workspaceName = ref('')
const workspaceLoading = ref(false)
const workspaceSaving = ref(false)
const workspaceStatus = ref('')

const deletingUserId = ref('')
const pendingDeleteUser = ref(null)
const pendingVerifyUser = ref(null)
const verifyingUserId = ref('')

const viewingUserId = ref('')
const detailLoading = ref(false)
const detailStatus = ref('')
const selectedUserDetail = ref(null)

const createMemberOpen = ref(false)
const creatingMember = ref(false)
const createMemberForm = ref({
  name: '',
  email: '',
  password: '',
  role: 'USER',
})

const currentUserId = computed(() => currentUser.value?.id || '')
const canPrevPage = computed(() => page.value > 1 && !loadingUsers.value)
const canNextPage = computed(() => page.value < totalPages.value && !loadingUsers.value)

const filteredUsers = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return users.value
  return users.value.filter((user) => {
    const name = String(user?.name || '').toLowerCase()
    const email = String(user?.email || '').toLowerCase()
    const role = String(user?.role || '').toLowerCase()
    return name.includes(query) || email.includes(query) || role.includes(query)
  })
})

const recentUsers = computed(() => filteredUsers.value.slice(0, 5))

const totalMembersDisplay = computed(() => new Intl.NumberFormat().format(totalUsers.value || 0))
const activePagesEstimate = computed(() => new Intl.NumberFormat().format(summary.value.activePages || 0))
const storageUsedGb = computed(() => Number(summary.value.storageUsedGb || 0))
const storageLimitGb = computed(() => Number(summary.value.storageLimitGb || 50))
const storagePercent = computed(() => Math.min(100, Number(summary.value.storagePercent || 0)))

const headerTitle = computed(() => {
  if (navActive.value === 'members') return 'Members'
  if (navActive.value === 'settings') return 'Settings'
  if (navActive.value === 'billing') return 'Billing'
  if (navActive.value === 'security') return 'Security'
  if (navActive.value === 'help') return 'Help Center'
  return 'Overview'
})

const headerSubtitle = computed(() => {
  if (navActive.value === 'members') return 'Manage user accounts and permissions.'
  if (navActive.value === 'settings') return 'Configure workspace basics.'
  if (navActive.value === 'billing') return 'Billing module is ready for integration.'
  if (navActive.value === 'security') return 'Security module is ready for integration.'
  if (navActive.value === 'help') return 'Help center module is ready for integration.'
  return 'Workspace health and activity at a glance.'
})

function authHeader(extra = {}) {
  const token = getAccessToken()
  return {
    ...extra,
    Authorization: `Bearer ${token}`,
  }
}

async function fetchUsers(requestedPage = page.value) {
  loadingUsers.value = true
  membersStatus.value = 'Loading users...'

  try {
    const safePage = Math.max(1, Number(requestedPage) || 1)
    const params = new URLSearchParams({
      page: String(safePage),
      limit: String(limit.value),
    })

    const res = await http.get(`/api/users?${params.toString()}`, {
      headers: authHeader(),
    })

    const payload = res.data || {}
    if (isErrorStatus(res.status)) {
      membersStatus.value = payload.message || 'Failed to load users'
      return
    }

    users.value = Array.isArray(payload.data) ? payload.data : []
    const pagination = payload.pagination || {}
    page.value = Number(pagination.page) || safePage
    limit.value = Number(pagination.limit) || limit.value
    totalUsers.value = Number(pagination.total) || users.value.length
    totalPages.value = Math.max(1, Number(pagination.totalPages) || 1)

    if (totalUsers.value === 0) {
      membersStatus.value = 'No users found'
      return
    }

    const start = (page.value - 1) * limit.value + 1
    const end = Math.min(page.value * limit.value, totalUsers.value)
    membersStatus.value = `Showing ${start}-${end} of ${totalUsers.value} users`
  } catch {
    membersStatus.value = 'Failed to load users'
  } finally {
    loadingUsers.value = false
  }
}

async function fetchSummary() {
  try {
    const res = await http.get('/api/users/summary', {
      headers: authHeader(),
    })

    const payload = res.data || {}
    if (isErrorStatus(res.status)) return

    summary.value = {
      totalMembers: Number(payload?.data?.totalMembers || totalUsers.value || 0),
      activePages: Number(payload?.data?.activePages || 0),
      storageUsedGb: Number(payload?.data?.storageUsedGb || 0),
      storageLimitGb: Number(payload?.data?.storageLimitGb || 50),
      storagePercent: Number(payload?.data?.storagePercent || 0),
    }
  } catch {
    // Keep existing values.
  }
}

async function fetchWorkspaceSettings() {
  workspaceLoading.value = true
  workspaceStatus.value = ''

  try {
    const res = await http.get('/api/users/workspace-settings', {
      headers: authHeader(),
    })

    const payload = res.data || {}
    if (isErrorStatus(res.status)) {
      workspaceStatus.value = payload.message || 'Failed to load workspace settings'
      return
    }

    workspaceName.value = String(payload?.data?.name || '').trim()
  } catch {
    workspaceStatus.value = 'Failed to load workspace settings'
  } finally {
    workspaceLoading.value = false
  }
}

async function saveWorkspaceSettings() {
  const trimmed = workspaceName.value.trim()
  if (!trimmed) {
    workspaceStatus.value = 'Workspace name is required'
    return
  }
  if (trimmed.length > 80) {
    workspaceStatus.value = 'Workspace name must be 80 characters or fewer'
    return
  }

  workspaceSaving.value = true
  workspaceStatus.value = 'Saving...'

  try {
    const res = await http.put('/api/users/workspace-settings', { name: trimmed }, {
      headers: authHeader({ 'Content-Type': 'application/json' }),
    })

    const payload = res.data || {}
    if (isErrorStatus(res.status)) {
      workspaceStatus.value = payload.message || 'Failed to save settings'
      return
    }

    workspaceName.value = String(payload?.data?.name || trimmed)
    workspaceStatus.value = 'Settings saved'
  } catch {
    workspaceStatus.value = 'Failed to save settings'
  } finally {
    workspaceSaving.value = false
  }
}

async function goToPage(nextPage) {
  if (loadingUsers.value) return
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

function formatRelativeTime(value) {
  if (!value) return 'N/A'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'N/A'

  const diffMs = Date.now() - date.getTime()
  if (diffMs < 60_000) return 'Just now'
  if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)} min ago`
  if (diffMs < 86_400_000) return `${Math.floor(diffMs / 3_600_000)} hr ago`
  if (diffMs < 172_800_000) return 'Yesterday'
  return `${Math.floor(diffMs / 86_400_000)} days ago`
}

function roleLabel(role) {
  if (role === 'ADMIN') return 'Admin'
  return 'Member'
}

function getInitials(user) {
  const text = String(user?.name || user?.email || 'U')
  const parts = text.trim().split(/\s+/).filter(Boolean).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() || '').join('') || 'U'
}

function selectTab(tab) {
  navActive.value = tab
}

function openCreateMemberModal() {
  createMemberForm.value = { name: '', email: '', password: '', role: 'USER' }
  createMemberOpen.value = true
}

function closeCreateMemberModal() {
  if (creatingMember.value) return
  createMemberOpen.value = false
}

async function createMember() {
  const email = createMemberForm.value.email.trim().toLowerCase()
  const password = createMemberForm.value.password
  const name = createMemberForm.value.name.trim()
  const role = createMemberForm.value.role === 'ADMIN' ? 'ADMIN' : 'USER'

  if (!email || !email.includes('@')) {
    membersStatus.value = 'Please enter a valid member email'
    return
  }
  if (!password || password.length < 8) {
    membersStatus.value = 'Password must be at least 8 characters'
    return
  }

  creatingMember.value = true
  membersStatus.value = 'Creating member...'

  try {
    const res = await http.post('/api/users', { email, password, name: name || undefined, role }, {
      headers: authHeader({ 'Content-Type': 'application/json' }),
    })

    const payload = res.data || {}
    if (isErrorStatus(res.status)) {
      membersStatus.value = payload.message || 'Failed to create member'
      return
    }

    closeCreateMemberModal()
    await Promise.all([fetchUsers(1), fetchSummary()])
    membersStatus.value = `Member ${email} created`
  } catch {
    membersStatus.value = 'Failed to create member'
  } finally {
    creatingMember.value = false
  }
}

function openDeleteDialog(user) {
  if (!user || !user.id || user.id === currentUserId.value) {
    membersStatus.value = 'You cannot delete your own account from admin'
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
    membersStatus.value = 'You cannot delete your own account from admin'
    closeDeleteDialog()
    return
  }

  deletingUserId.value = userId
  closeDeleteDialog()
  membersStatus.value = 'Deleting user...'

  try {
    const res = await http.delete(`/api/users/${userId}`, {
      headers: authHeader(),
    })

    if (isErrorStatus(res.status)) {
      const payload = res.data || {}
      membersStatus.value = payload.message || 'Failed to delete user'
      return
    }

    await fetchUsers(page.value)
    if (users.value.length === 0 && page.value > 1) {
      await fetchUsers(page.value - 1)
    }
    await fetchSummary()
    membersStatus.value = 'User deleted'
  } catch {
    membersStatus.value = 'Failed to delete user'
  } finally {
    deletingUserId.value = ''
  }
}

async function verifyUserEmail(user) {
  const userId = user?.id
  if (!userId) return
  if (user?.isEmailVerified) {
    membersStatus.value = 'Email is already verified'
    return
  }
  pendingVerifyUser.value = user
}

function closeVerifyDialog() {
  if (Boolean(verifyingUserId.value)) return
  pendingVerifyUser.value = null
}

async function confirmVerifyUser() {
  const user = pendingVerifyUser.value
  if (!user) return
  await verifyUserEmailNow(user)
  pendingVerifyUser.value = null
}

async function verifyUserEmailNow(user) {
  const userId = user?.id
  if (!userId) return
  if (user?.isEmailVerified) {
    membersStatus.value = 'Email is already verified'
    return
  }

  verifyingUserId.value = userId
  membersStatus.value = 'Verifying user email...'

  try {
    const res = await http.patch(`/auth-api/auths/${userId}/verify-email`, null, {
      headers: authHeader(),
    })

    const payload = res.data || {}
    if (isErrorStatus(res.status)) {
      membersStatus.value = payload.message || 'Failed to verify email'
      return
    }

    users.value = users.value.map((row) => {
      if (row?.id !== userId) return row
      return {
        ...row,
        isEmailVerified: true,
        emailVerifiedAt: payload?.data?.verifiedAt || row?.emailVerifiedAt || new Date().toISOString(),
      }
    })

    if (selectedUserDetail.value?.id === userId) {
      selectedUserDetail.value = {
        ...selectedUserDetail.value,
        isEmailVerified: true,
        emailVerifiedAt:
          payload?.data?.verifiedAt ||
          selectedUserDetail.value?.emailVerifiedAt ||
          new Date().toISOString(),
      }
    }

    const targetEmail = user?.email || 'user'
    membersStatus.value = payload.message || `Email verified for ${targetEmail}`
  } catch {
    membersStatus.value = 'Failed to verify email'
  } finally {
    verifyingUserId.value = ''
  }
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
    const res = await http.get(`/api/users/${user.id}`, {
      headers: authHeader(),
    })

    const payload = res.data || {}
    if (isErrorStatus(res.status)) {
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

async function handleLogout() {
  await logout()
  router.replace('/login')
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

  await Promise.all([fetchUsers(), fetchSummary(), fetchWorkspaceSettings()])
})
</script>

<template>
  <main class="h-screen overflow-hidden bg-slate-100">
    <div class="grid h-screen grid-cols-1 lg:grid-cols-[260px_1fr]">
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
          <BaseButton variant="secondary" class="w-full" @click="handleLogout">Logout</BaseButton>
        </div>
      </aside>

      <section class="h-screen overflow-y-auto">
        <header class="sticky top-0 z-10 border-b border-slate-200 bg-white px-8 py-4">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 class="text-2xl font-semibold text-slate-900">{{ headerTitle }}</h1>
              <p class="mt-1 text-sm text-slate-500">{{ headerSubtitle }}</p>
            </div>
            <div v-if="navActive === 'members'" class="flex flex-wrap items-center gap-2">
              <input
                v-model.trim="searchQuery"
                type="search"
                placeholder="Search members"
                class="w-64 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
              />
              <BaseButton variant="secondary" :disabled="loadingUsers" @click="fetchUsers(page)">Reload</BaseButton>
              <BaseButton @click="openCreateMemberModal">Add Member</BaseButton>
            </div>
          </div>
        </header>

        <div class="px-8 py-6">
          <section v-if="navActive === 'overview'" class="space-y-6">
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
                <BaseButton variant="secondary" @click="selectTab('members')">Manage</BaseButton>
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
                        <BaseButton variant="secondary" @click="openDetailsDialog(user)">View</BaseButton>
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

          <section v-if="navActive === 'members'" class="space-y-4">
            <div class="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3">
              <label class="inline-flex items-center gap-2 text-sm text-slate-600">
                Per page
                <Select
                  :model-value="String(limit)"
                  :disabled="loadingUsers"
                  @update:model-value="(value) => { limit = Number(value); onLimitChange() }"
                >
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
                          v-if="!user.isEmailVerified"
                          variant="secondary"
                          :disabled="verifyingUserId === user.id"
                          @click="verifyUserEmail(user)"
                        >
                          {{ verifyingUserId === user.id ? 'Verifying...' : 'Verify' }}
                        </BaseButton>
                        <BaseButton
                          variant="secondary"
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
                  <tr v-if="!loadingUsers && filteredUsers.length === 0">
                    <td colspan="5" class="px-5 py-8 text-center text-slate-500">No members found</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="flex flex-wrap items-center justify-between gap-2">
              <p class="text-xs text-slate-500">Page {{ page }} of {{ totalPages }}</p>
              <div class="flex items-center gap-2">
                <BaseButton variant="secondary" :disabled="!canPrevPage" @click="goToPage(page - 1)">Previous</BaseButton>
                <BaseButton variant="secondary" :disabled="!canNextPage" @click="goToPage(page + 1)">Next</BaseButton>
              </div>
            </div>
          </section>

          <section v-if="navActive === 'settings'" class="rounded-xl border border-slate-200 bg-white p-6">
            <div class="max-w-xl">
              <label class="block text-sm font-medium text-slate-700">Workspace Name</label>
              <input
                v-model="workspaceName"
                :disabled="workspaceLoading || workspaceSaving"
                type="text"
                class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800"
                placeholder="Enter workspace name"
              />
              <div class="mt-3 flex items-center justify-between gap-3">
                <p class="text-sm text-slate-500">{{ workspaceStatus || 'Name appears in the admin sidebar.' }}</p>
                <BaseButton :disabled="workspaceLoading || workspaceSaving" @click="saveWorkspaceSettings">
                  {{ workspaceSaving ? 'Saving...' : 'Save' }}
                </BaseButton>
              </div>
            </div>
          </section>

          <section
            v-if="navActive === 'billing' || navActive === 'security' || navActive === 'help'"
            class="rounded-xl border border-slate-200 bg-white p-10 text-center"
          >
            <p class="text-lg font-semibold text-slate-800">No content yet</p>
            <p class="mt-2 text-sm text-slate-500">Ready to add content.</p>
          </section>
        </div>
      </section>
    </div>
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
    :open="Boolean(pendingVerifyUser)"
    title="Verify user email?"
    description="This will mark the user's email as verified."
    @close="closeVerifyDialog"
  >
    <p class="truncate text-sm text-neutral-700">
      {{ pendingVerifyUser?.name || pendingVerifyUser?.email || 'Selected user' }}
    </p>
    <template #actions>
      <BaseButton variant="secondary" :disabled="Boolean(verifyingUserId)" @click="closeVerifyDialog">Cancel</BaseButton>
      <BaseButton :disabled="Boolean(verifyingUserId)" @click="confirmVerifyUser">
        {{ Boolean(verifyingUserId) ? 'Verifying...' : 'Confirm Verify' }}
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
      <BaseButton
        v-if="selectedUserDetail && !selectedUserDetail.isEmailVerified"
        :disabled="detailLoading || verifyingUserId === selectedUserDetail.id"
        @click="verifyUserEmail(selectedUserDetail)"
      >
        {{ verifyingUserId === selectedUserDetail?.id ? 'Verifying...' : 'Verify Email' }}
      </BaseButton>
      <BaseButton variant="secondary" :disabled="detailLoading" @click="closeDetailsDialog">Close</BaseButton>
    </template>
  </BaseModalDialog>

  <BaseModalDialog
    :open="createMemberOpen"
    title="Add member"
    description="Create a user profile from the admin dashboard."
    max-width-class="max-w-lg"
    @close="closeCreateMemberModal"
  >
    <div class="grid gap-3">
      <label class="text-sm font-semibold text-neutral-700">
        Name
        <input
          v-model="createMemberForm.name"
          type="text"
          class="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-800"
          placeholder="Jane Doe"
          :disabled="creatingMember"
        />
      </label>
      <label class="text-sm font-semibold text-neutral-700">
        Email
        <input
          v-model="createMemberForm.email"
          type="email"
          class="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-800"
          placeholder="jane@example.com"
          :disabled="creatingMember"
        />
      </label>
      <label class="text-sm font-semibold text-neutral-700">
        Password
        <input
          v-model="createMemberForm.password"
          type="password"
          class="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-800"
          placeholder="Minimum 8 characters"
          :disabled="creatingMember"
        />
      </label>
      <label class="text-sm font-semibold text-neutral-700">
        Role
        <Select v-model="createMemberForm.role" :disabled="creatingMember">
          <SelectTrigger class="mt-1 w-full border-neutral-200 text-sm text-neutral-800">
            <SelectValue placeholder="Select role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="USER">Member</SelectItem>
            <SelectItem value="ADMIN">Admin</SelectItem>
          </SelectContent>
        </Select>
      </label>
    </div>

    <template #actions>
      <BaseButton variant="secondary" :disabled="creatingMember" @click="closeCreateMemberModal">Cancel</BaseButton>
      <BaseButton :disabled="creatingMember" @click="createMember">
        {{ creatingMember ? 'Creating...' : 'Create Member' }}
      </BaseButton>
    </template>
  </BaseModalDialog>
</template>

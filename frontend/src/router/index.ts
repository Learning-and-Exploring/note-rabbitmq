import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from '@/features/auth/composables/useAuth'
import LoginView from '@/features/auth/views/LoginView.vue'
import NotesView from '@/features/notes/views/NotesView.vue'
import PublicNoteView from '@/features/notes/views/PublicNoteView.vue'
import AdminUsersView from '@/features/admin/views/AdminUsersView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: { name: 'notes' },
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { guestOnly: true },
    },
    {
      path: '/notes',
      name: 'notes',
      component: NotesView,
      meta: { requiresAuth: true },
    },
    {
      path: '/admin/users',
      name: 'admin-users',
      component: AdminUsersView,
      meta: { requiresAuth: true, requiresAdmin: true },
    },
    {
      path: '/shared/:token',
      name: 'public-note',
      component: PublicNoteView,
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: { name: 'notes' },
    },
  ],
})

router.beforeEach(async (to) => {
  if (to.name === 'public-note') {
    return true
  }

  const { restoreSession, isAuthenticated, isAdmin } = useAuth()
  await restoreSession()

  if (to.meta.requiresAuth && !isAuthenticated.value) {
    return { name: 'login' }
  }

  if (to.meta.guestOnly && isAuthenticated.value) {
    return { name: 'notes' }
  }

  if (to.meta.requiresAdmin && !isAdmin.value) {
    return { name: 'notes' }
  }

  return true
})

export default router

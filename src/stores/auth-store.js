import { defineStore } from 'pinia'
import { apiRequest } from '@/services/api'

const STORAGE_KEY = 'systems-ui-session'

function readSession() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return null
  }
}

export const useAuthStore = defineStore('auth', {
  state: () => {
    const session = readSession()
    return {
      token: session?.token || '',
      user: session?.user || null,
    }
  },
  getters: {
    isAuthenticated: (state) => Boolean(state.token),
    role: (state) => state.user?.role || '',
    isAdmin: (state) => state.user?.role === 'ADMIN',
    isStaff: (state) => ['ADMIN', 'TEACHER'].includes(state.user?.role),
  },
  actions: {
    async login(email, password) {
      const session = await apiRequest('/auth/login', {
        method: 'POST',
        body: { email, password },
      })
      this.token = session.token
      this.user = { id: session.id, email: session.email, role: session.role }
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: this.token, user: this.user }))
    },
    async ensureCurrentUser() {
      if (!this.token || this.user?.id) return
      const currentUser = await apiRequest('/auth/me', { token: this.token })
      this.user = currentUser
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: this.token, user: this.user }))
    },
    logout() {
      this.token = ''
      this.user = null
      localStorage.removeItem(STORAGE_KEY)
    },
  },
})

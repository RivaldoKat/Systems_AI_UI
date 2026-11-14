<template>
  <q-layout view="lHh Lpr lFf" class="app-shell">
    <q-drawer v-model="drawerOpen" show-if-above bordered :width="252" class="nav-drawer">
      <div class="brand-lockup">
        <div class="brand-mark">L</div>
        <div>
          <div class="brand-name">Luma</div>
          <div class="brand-caption">Learning management</div>
        </div>
      </div>

      <div class="nav-caption">WORKSPACE</div>
      <q-list class="nav-list">
        <q-item
          v-for="item in navItems"
          :key="item.section"
          clickable
          :to="`/app/${item.section}`"
          active-class="nav-item-active"
          class="nav-item"
        >
          <q-item-section avatar><q-icon :name="item.icon" /></q-item-section>
          <q-item-section>{{ item.label }}</q-item-section>
          <q-item-section v-if="item.section === 'users'" side>
            <q-badge color="blue-1" text-color="primary" label="ADMIN" />
          </q-item-section>
        </q-item>
      </q-list>

      <div class="drawer-bottom">
        <div class="help-card">
          <q-icon name="auto_awesome" size="19px" />
          <div>
            <strong>Keep learning</strong>
            <span>Your campus, connected.</span>
          </div>
        </div>
        <q-separator class="q-my-md" />
        <div class="profile-row">
          <q-avatar color="blue-1" text-color="primary" size="40px">{{ initials }}</q-avatar>
          <div class="profile-copy">
            <strong>{{ auth.user?.email }}</strong>
            <span>{{ roleLabel }}</span>
          </div>
          <q-btn flat round dense icon="logout" aria-label="Sign out" @click="signOut">
            <q-tooltip>Sign out</q-tooltip>
          </q-btn>
        </div>
      </div>
    </q-drawer>

    <q-header class="topbar">
      <q-toolbar>
        <q-btn
          flat
          round
          dense
          icon="menu"
          class="lt-md q-mr-sm"
          @click="drawerOpen = !drawerOpen"
        />
        <div class="breadcrumbs">
          <span>Workspace</span><q-icon name="chevron_right" />
          <strong>{{ currentTitle }}</strong>
        </div>
        <q-space />
        <div class="today-label">{{ today }}</div>
        <q-btn flat round dense icon="notifications_none" class="notification-button">
          <q-badge floating rounded color="orange-5" />
        </q-btn>
        <q-avatar color="blue-1" text-color="primary" size="34px" class="gt-xs">{{
          initials
        }}</q-avatar>
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth-store'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const drawerOpen = ref(true)

const baseItems = [
  { section: 'overview', label: 'Overview', icon: 'space_dashboard' },
  { section: 'courses', label: 'Courses', icon: 'auto_stories' },
  { section: 'assignments', label: 'Assignments', icon: 'assignment' },
  { section: 'announcements', label: 'Announcements', icon: 'campaign' },
  { section: 'enrollments', label: 'Enrollments', icon: 'groups' },
  { section: 'attendance', label: 'Attendance', icon: 'fact_check' },
  { section: 'submissions', label: 'Submissions', icon: 'task_alt' },
]
const navItems = computed(() => {
  if (auth.role === 'LEARNER') {
    return baseItems.filter((item) =>
      ['overview', 'courses', 'assignments', 'announcements', 'submissions'].includes(item.section),
    )
  }
  return auth.isAdmin
    ? [...baseItems, { section: 'users', label: 'People', icon: 'people_alt' }]
    : baseItems.filter((item) => item.section !== 'users')
})
const titleBySection = Object.fromEntries(
  [...baseItems, { section: 'users', label: 'People' }].map(({ section, label }) => [
    section,
    label,
  ]),
)
const currentTitle = computed(() => titleBySection[route.params.section] || 'Overview')
const roleLabel = computed(() =>
  auth.role.toLowerCase().replace(/^./, (letter) => letter.toUpperCase()),
)
const initials = computed(() => auth.user?.email?.slice(0, 1).toUpperCase() || 'U')
const today = new Intl.DateTimeFormat('en', {
  weekday: 'short',
  month: 'long',
  day: 'numeric',
}).format(new Date())

function signOut() {
  auth.logout()
  router.push('/login')
}
</script>

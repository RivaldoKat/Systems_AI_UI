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
        <q-btn
          flat
          round
          dense
          icon="notifications_none"
          class="notification-button"
          aria-label="Recent assignments, announcements, and grades"
        >
          <q-badge v-if="activityCount" floating rounded color="orange-5" :label="activityCount" />
          <q-tooltip>Recent activity</q-tooltip>
          <q-menu
            anchor="bottom right"
            self="top right"
            :offset="[0, 10]"
            @show="loadRecentActivity"
          >
            <q-card class="recent-activity-menu">
              <q-card-section class="recent-activity-heading">
                <strong>Recent activity</strong>
                <span>Assignments, announcements, and grades</span>
              </q-card-section>
              <q-banner v-if="activityError" dense class="recent-activity-error">
                {{ activityError }}
              </q-banner>
              <q-inner-loading :showing="activityLoading">
                <q-spinner-dots color="primary" size="32px" />
              </q-inner-loading>
              <template v-if="!activityLoading">
                <q-separator />
                <div class="recent-activity-section-title">Assignments</div>
                <q-list v-if="recentAssignments.length" class="recent-activity-list">
                  <q-item
                    v-for="assignment in recentAssignments"
                    :key="`assignment-${assignment.id}`"
                    clickable
                    v-close-popup
                    to="/app/assignments"
                    class="recent-activity-item"
                  >
                    <q-item-section avatar
                      ><q-icon name="assignment" color="primary"
                    /></q-item-section>
                    <q-item-section>
                      <q-item-label>{{ assignment.title }}</q-item-label>
                      <q-item-label caption>
                        {{ assignment.courseName }} · Due
                        {{ formatActivityDate(assignment.dueDate) }}
                      </q-item-label>
                    </q-item-section>
                  </q-item>
                </q-list>
                <div v-else class="recent-activity-empty">No assignments to show.</div>

                <q-separator />
                <div class="recent-activity-section-title">Announcements</div>
                <q-list v-if="recentAnnouncements.length" class="recent-activity-list">
                  <q-item
                    v-for="announcement in recentAnnouncements"
                    :key="`announcement-${announcement.id}`"
                    clickable
                    v-close-popup
                    to="/app/announcements"
                    class="recent-activity-item"
                  >
                    <q-item-section avatar
                      ><q-icon name="campaign" color="primary"
                    /></q-item-section>
                    <q-item-section>
                      <q-item-label>{{ announcement.title }}</q-item-label>
                      <q-item-label caption>
                        {{ announcement.courseName || 'School-wide' }} ·
                        {{ formatActivityDate(announcement.createdAt) }}
                      </q-item-label>
                    </q-item-section>
                  </q-item>
                </q-list>
                <div v-else class="recent-activity-empty">No announcements to show.</div>

                <q-separator />
                <div class="recent-activity-section-title">Grades</div>
                <q-list v-if="recentGrades.length" class="recent-activity-list">
                  <q-item
                    v-for="grade in recentGrades"
                    :key="`grade-${grade.id}`"
                    class="recent-activity-item"
                  >
                    <q-item-section avatar
                      ><q-icon name="task_alt" color="positive"
                    /></q-item-section>
                    <q-item-section>
                      <q-item-label>{{ grade.assignmentTitle }}</q-item-label>
                      <q-item-label caption>
                        <template v-if="auth.role !== 'LEARNER'"
                          >{{ grade.studentName }} ·
                        </template>
                        Grade: {{ grade.grade ?? '—' }} ·
                        {{ formatActivityDate(grade.gradedAt) }}
                      </q-item-label>
                    </q-item-section>
                  </q-item>
                </q-list>
                <div v-else class="recent-activity-empty">No graded work to show.</div>

                <q-separator />
                <div class="recent-activity-section-title">Recently visited</div>
                <q-list v-if="recentVisits.length" class="recent-activity-list">
                  <q-item
                    v-for="visit in recentVisits"
                    :key="`visit-${visit.section}`"
                    clickable
                    v-close-popup
                    :to="`/app/${visit.section}`"
                    class="recent-activity-item"
                  >
                    <q-item-section avatar>
                      <q-icon :name="visit.icon" color="primary" />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label>{{ visit.label }}</q-item-label>
                      <q-item-label caption>{{ formatVisitTime(visit.visitedAt) }}</q-item-label>
                    </q-item-section>
                  </q-item>
                </q-list>
                <div v-else class="recent-activity-empty">Visited pages will appear here.</div>
                <div
                  v-if="!activityError && !activityCount"
                  class="recent-activity-empty recent-activity-empty-all"
                >
                  Recent activity will appear here as items are added or graded.
                </div>
              </template>
            </q-card>
          </q-menu>
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
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { apiRequest } from '@/services/api'
import { useAuthStore } from '@/stores/auth-store'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const drawerOpen = ref(true)
const recentVisits = ref(readRecentVisits())
const recentAssignments = ref([])
const recentAnnouncements = ref([])
const recentGrades = ref([])
const activityLoading = ref(false)
const activityError = ref('')

const baseItems = [
  { section: 'overview', label: 'Overview', icon: 'space_dashboard' },
  { section: 'courses', label: 'Courses', icon: 'auto_stories' },
  { section: 'assignments', label: 'Assignments', icon: 'assignment' },
  { section: 'quizzes', label: 'Quizzes', icon: 'quiz' },
  { section: 'announcements', label: 'Announcements', icon: 'campaign' },
  { section: 'enrollments', label: 'Enrollments', icon: 'groups' },
  { section: 'attendance', label: 'Attendance', icon: 'fact_check' },
  { section: 'submissions', label: 'Submissions', icon: 'task_alt' },
]
const navItems = computed(() => {
  if (auth.role === 'LEARNER') {
    return baseItems.filter((item) =>
      ['overview', 'courses', 'assignments', 'quizzes', 'announcements', 'submissions'].includes(
        item.section,
      ),
    )
  }
  const items = baseItems.filter(
    (item) => item.section !== 'users' && !(auth.role === 'PARENT' && item.section === 'quizzes'),
  )
  return auth.isAdmin
    ? [...items, { section: 'users', label: 'People', icon: 'people_alt' }]
    : items
})
const titleBySection = Object.fromEntries(
  [...baseItems, { section: 'users', label: 'People' }].map(({ section, label }) => [
    section,
    label,
  ]),
)
const currentSection = computed(
  () => route.params.section || (route.path === '/app/quizzes' ? 'quizzes' : null),
)
const currentTitle = computed(() => titleBySection[currentSection.value] || 'Overview')
const activityCount = computed(
  () =>
    recentAssignments.value.length + recentAnnouncements.value.length + recentGrades.value.length,
)
const recentVisitsStorageKey = computed(
  () => `luma-recent-visits:${auth.user?.id || auth.user?.email || 'user'}`,
)
const roleLabel = computed(() =>
  auth.role.toLowerCase().replace(/^./, (letter) => letter.toUpperCase()),
)
const initials = computed(() => auth.user?.email?.slice(0, 1).toUpperCase() || 'U')
const today = new Intl.DateTimeFormat('en', {
  weekday: 'short',
  month: 'long',
  day: 'numeric',
}).format(new Date())

watch(
  () => currentSection.value,
  (section) => {
    const item = navItems.value.find((navItem) => navItem.section === section)
    if (!item) return

    const visits = [
      {
        section: item.section,
        label: item.label,
        icon: item.icon,
        visitedAt: new Date().toISOString(),
      },
      ...recentVisits.value.filter((visit) => visit.section !== item.section),
    ].slice(0, 5)
    recentVisits.value = visits
    localStorage.setItem(recentVisitsStorageKey.value, JSON.stringify(visits))
  },
  { immediate: true },
)

function readRecentVisits() {
  try {
    const visits = JSON.parse(
      localStorage.getItem(`luma-recent-visits:${auth.user?.id || auth.user?.email || 'user'}`) ||
        '[]',
    )
    return Array.isArray(visits) ? visits : []
  } catch {
    return []
  }
}

function formatVisitTime(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
    date,
  )
}

function formatActivityDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Date unavailable'
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date)
}

async function loadRecentActivity() {
  activityLoading.value = true
  activityError.value = ''
  const results = await Promise.allSettled([
    apiRequest('/assignments', {
      token: auth.token,
      params: { page: 0, size: 4, sort: 'dueDate,asc' },
    }),
    apiRequest('/announcements/', {
      token: auth.token,
      params: { page: 0, size: 4, sort: 'createdAt,desc' },
    }),
    apiRequest('/submissions/recent', {
      token: auth.token,
      params: { page: 0, size: 4, sort: 'gradedAt,desc' },
    }),
  ])
  const [assignments, announcements, grades] = results
  recentAssignments.value =
    assignments.status === 'fulfilled' ? assignments.value.content || [] : []
  recentAnnouncements.value =
    announcements.status === 'fulfilled' ? announcements.value.content || [] : []
  recentGrades.value = grades.status === 'fulfilled' ? grades.value.content || [] : []

  const failures = results.flatMap((result, index) =>
    result.status === 'rejected' ? [['assignments', 'announcements', 'grades'][index]] : [],
  )
  if (failures.length) activityError.value = `Could not load recent ${failures.join(', ')}.`
  activityLoading.value = false
}

function signOut() {
  auth.logout()
  router.push('/login')
}
</script>

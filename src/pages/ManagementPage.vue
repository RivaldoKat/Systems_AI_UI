<template>
  <q-page class="workspace-page">
    <div v-if="section === 'overview'" class="page-content">
      <div class="page-heading overview-heading">
        <div>
          <div class="page-eyebrow">{{ currentDate }}</div>
          <h1>Good to see you, {{ greetingName }} <span class="wave">✦</span></h1>
          <p>Here’s what’s happening across your learning community.</p>
        </div>
        <q-btn
          icon="refresh"
          label="Refresh"
          no-caps
          outline
          color="dark"
          class="refresh-button"
          @click="loadOverview"
        />
      </div>

      <q-banner v-if="pageError" rounded class="error-banner q-mb-lg">
        <template #avatar><q-icon name="info_outline" /></template>
        {{ pageError }}
        <template #action><q-btn flat label="Retry" no-caps @click="loadOverview" /></template>
      </q-banner>

      <div class="stats-grid">
        <q-card
          v-for="stat in stats"
          :key="stat.label"
          flat
          bordered
          :clickable="Boolean(stat.section)"
          :class="['stat-card', { 'stat-card-clickable': stat.section }]"
          :tabindex="stat.section ? 0 : undefined"
          :role="stat.section ? 'link' : undefined"
          :aria-label="stat.section ? `View ${stat.label}` : undefined"
          @click="navigateToStat(stat)"
          @keydown.enter.prevent="navigateToStat(stat)"
          @keydown.space.prevent="navigateToStat(stat)"
        >
          <q-card-section>
            <div class="stat-top">
              <span class="stat-label">{{ stat.label }}</span>
              <div class="stat-icon" :class="`tone-${stat.tone}`"><q-icon :name="stat.icon" /></div>
            </div>
            <div class="stat-value">{{ overviewLoading ? '—' : stat.value }}</div>
            <div class="stat-foot">
              <span class="stat-dot" :class="`tone-dot-${stat.tone}`"></span>{{ stat.detail }}
            </div>
          </q-card-section>
        </q-card>
      </div>

      <div class="overview-grid">
        <q-card flat bordered class="panel-card announcement-panel">
          <q-card-section class="panel-heading">
            <div>
              <h2>Latest announcements</h2>
              <p>
                {{
                  auth.role === 'LEARNER'
                    ? 'Updates for your courses and school'
                    : 'Updates from across your school'
                }}
              </p>
            </div>
            <q-btn
              flat
              round
              icon="north_east"
              color="blue-grey-6"
              to="/app/announcements"
              aria-label="View announcements"
            />
          </q-card-section>
          <q-separator />
          <q-card-section v-if="overviewLoading" class="loading-state"
            ><q-spinner-dots color="primary" size="32px"
          /></q-card-section>
          <q-card-section v-else-if="recentAnnouncements.length === 0" class="empty-state">
            <q-icon name="campaign" /><span>No announcements yet.</span>
          </q-card-section>
          <q-list v-else separator class="announcement-list">
            <q-item v-for="item in recentAnnouncements" :key="item.id" class="announcement-row">
              <q-item-section avatar
                ><div class="announcement-avatar"><q-icon name="campaign" /></div
              ></q-item-section>
              <q-item-section>
                <q-item-label class="announcement-title">{{ item.title }}</q-item-label>
                <q-item-label caption
                  >{{ item.authorName }} · {{ formatDate(item.createdAt) }}</q-item-label
                >
              </q-item-section>
              <q-item-section side
                ><q-icon name="chevron_right" color="blue-grey-4"
              /></q-item-section>
            </q-item>
          </q-list>
        </q-card>

        <q-card flat bordered class="panel-card shortcuts-panel">
          <q-card-section class="panel-heading">
            <div>
              <h2>Quick access</h2>
              <p>Jump back into your workspace</p>
            </div>
          </q-card-section>
          <q-card-section class="shortcut-list">
            <q-btn
              v-for="link in quickLinks"
              :key="link.section"
              flat
              no-caps
              class="shortcut-link"
              :to="`/app/${link.section}`"
            >
              <span class="shortcut-icon"><q-icon :name="link.icon" /></span>
              <span class="shortcut-copy"
                ><strong>{{ link.label }}</strong
                ><small>{{ link.caption }}</small></span
              >
              <q-space /><q-icon name="arrow_forward" class="shortcut-arrow" />
            </q-btn>
          </q-card-section>
        </q-card>
      </div>

      <div class="dashboard-footer">
        <q-icon name="verified_user" /> Your school workspace is up to date
      </div>
    </div>

    <div v-else class="page-content">
      <div class="page-heading list-heading">
        <div>
          <div class="page-eyebrow">SCHOOL WORKSPACE</div>
          <h1>{{ sectionMeta.title }}</h1>
          <p>{{ sectionMeta.description }}</p>
        </div>
        <q-btn
          v-if="canCreate"
          unelevated
          color="primary"
          icon="add"
          no-caps
          :label="sectionMeta.createLabel"
          class="create-button"
          @click="openCreate"
        />
      </div>

      <q-banner v-if="pageError" rounded class="error-banner q-mb-lg">
        <template #avatar><q-icon name="info_outline" /></template>
        {{ pageError }}
        <template #action><q-btn flat label="Retry" no-caps @click="loadSection" /></template>
      </q-banner>

      <q-card
        v-if="['attendance', 'enrollments'].includes(section)"
        flat
        bordered
        class="filter-card"
      >
        <div class="filter-caption"><q-icon name="tune" /> COURSE FILTER</div>
        <q-select
          v-model="selectedCourseId"
          :options="courseSelectOptions"
          option-value="id"
          option-label="label"
          emit-value
          map-options
          outlined
          dense
          clearable
          use-input
          input-debounce="0"
          placeholder="Choose a course"
          class="course-filter"
          @update:model-value="onCourseChanged"
        />
        <span class="filter-hint"
          >Choose a course to load its {{ sectionMeta.title.toLowerCase() }}.</span
        >
      </q-card>

      <q-card v-if="section === 'submissions'" flat bordered class="filter-card">
        <template v-if="auth.role === 'LEARNER'">
          <div class="filter-caption"><q-icon name="person" /> MY SUBMISSIONS</div>
          <span class="filter-hint">Showing submissions for your account.</span>
        </template>
        <template v-else>
          <div class="filter-caption"><q-icon name="person_search" /> LEARNER</div>
          <q-select
            v-model="selectedLearnerId"
            :options="learnerSelectOptions"
            outlined
            dense
            clearable
            use-input
            input-debounce="0"
            emit-value
            map-options
            option-label="label"
            option-value="value"
            placeholder="Search or choose a learner"
            class="course-filter"
            @update:model-value="onLearnerChanged"
          />
          <q-btn
            unelevated
            color="primary"
            icon="search"
            label="Load submissions"
            no-caps
            :disable="!selectedLearnerId"
            @click="loadSection"
          />
          <span class="filter-hint">Choose a learner by name to view their submissions.</span>
        </template>
      </q-card>

      <q-card flat bordered class="table-card">
        <div class="table-toolbar">
          <div class="table-count">
            <span class="count-mark"><q-icon :name="sectionMeta.icon" /></span>
            <span
              ><strong>{{ totalElements.toLocaleString() }}</strong
              ><small>{{ sectionMeta.title.toLowerCase() }} in this view</small></span
            >
          </div>
          <q-input
            v-model="search"
            outlined
            dense
            clearable
            placeholder="Search this page"
            class="table-search"
          >
            <template #prepend><q-icon name="search" /></template>
          </q-input>
        </div>
        <q-separator />
        <q-table
          flat
          row-key="id"
          :rows="filteredRows"
          :columns="columns"
          :loading="loading"
          :pagination="pagination"
          :rows-per-page-options="[10, 25, 50]"
          hide-bottom
          @request="onTableRequest"
        >
          <template #body-cell-status="props">
            <q-td :props="props"
              ><q-badge rounded :class="statusClass(props.value)" :label="props.value"
            /></q-td>
          </template>
          <template #body-cell-attachmentUrl="props">
            <q-td :props="props">
              <q-btn
                v-if="props.value"
                flat
                dense
                no-caps
                icon="download"
                label="Download"
                :loading="downloadingAssignmentId === props.row.id"
                @click="downloadAssignmentAttachment(props.row)"
              />
              <span v-else>—</span>
            </q-td>
          </template>
          <template #body-cell-role="props">
            <q-td :props="props"><q-badge rounded class="role-badge" :label="props.value" /></q-td>
          </template>
          <template #body-cell-actions="props">
            <q-td :props="props" class="text-right">
              <q-btn
                v-if="canSubmitAssignment"
                flat
                dense
                no-caps
                icon="upload_file"
                label="Submit"
                aria-label="Submit assignment"
                @click="openSubmission(props.row)"
              />
              <q-btn
                v-if="canEdit"
                flat
                round
                dense
                icon="edit"
                aria-label="Edit"
                @click="openEdit(props.row)"
              />
              <q-btn
                v-if="canDelete"
                flat
                round
                dense
                icon="delete_outline"
                aria-label="Delete"
                color="negative"
                @click="confirmDelete(props.row)"
              />
            </q-td>
          </template>
          <template #no-data>
            <div class="full-width empty-state table-empty">
              <q-icon :name="sectionMeta.icon" /><span>{{ emptyMessage }}</span>
            </div>
          </template>
          <template #loading>
            <q-inner-loading showing color="primary" />
          </template>
        </q-table>
        <q-separator />
        <div class="table-pagination">
          <span>Showing {{ rangeStart }}–{{ rangeEnd }} of {{ totalElements }}</span>
          <div class="pagination-controls">
            <q-select
              v-model="pagination.rowsPerPage"
              :options="[10, 25, 50]"
              dense
              borderless
              options-dense
              class="rows-select"
              @update:model-value="changePageSize"
            />
            <q-btn
              flat
              round
              dense
              icon="chevron_left"
              :disable="pagination.page <= 1 || loading"
              @click="changePage(pagination.page - 1)"
            />
            <span class="page-number">{{ pagination.page }}</span>
            <q-btn
              flat
              round
              dense
              icon="chevron_right"
              :disable="pagination.page >= pageCount || loading"
              @click="changePage(pagination.page + 1)"
            />
          </div>
        </div>
      </q-card>

      <q-dialog v-model="dialogOpen" persistent>
        <q-card class="form-dialog">
          <q-form @submit.prevent="saveRecord">
            <q-card-section class="dialog-heading">
              <div>
                <div class="page-eyebrow">{{ editing ? 'UPDATE RECORD' : 'NEW RECORD' }}</div>
                <h2>
                  {{
                    editing ? `Edit ${sectionMeta.singular.toLowerCase()}` : sectionMeta.createLabel
                  }}
                </h2>
              </div>
              <q-btn flat round dense icon="close" v-close-popup aria-label="Close dialog" />
            </q-card-section>
            <q-separator />
            <q-card-section class="dialog-fields">
              <div
                v-for="field in formFields"
                :key="field.key"
                class="dialog-field"
                :class="{ 'dialog-field-wide': field.multiline }"
              >
                <label class="field-label">{{ field.label }}</label>
                <q-select
                  v-if="field.options"
                  v-model="form[field.key]"
                  :options="field.options"
                  :label="field.placeholder"
                  use-input
                  input-debounce="0"
                  :rules="
                    field.required
                      ? [
                          (value) =>
                            (value !== null && value !== undefined && value !== '') ||
                            `${field.label} is required`,
                        ]
                      : []
                  "
                  outlined
                  dense
                  emit-value
                  map-options
                />
                <q-input
                  v-else
                  v-model="form[field.key]"
                  :type="field.multiline ? 'textarea' : field.type || 'text'"
                  :placeholder="field.placeholder || field.label"
                  :rules="
                    field.required
                      ? [
                          (value) =>
                            String(value ?? '').trim().length > 0 || `${field.label} is required`,
                        ]
                      : []
                  "
                  :min="field.type === 'number' ? 1 : undefined"
                  :step="field.type === 'number' ? 'any' : undefined"
                  :autogrow="field.multiline"
                  outlined
                  dense
                />
              </div>
              <div v-if="section === 'assignments'" class="dialog-field dialog-field-wide">
                <label class="field-label">Attachment (optional)</label>
                <q-file
                  v-model="assignmentFile"
                  outlined
                  dense
                  clearable
                  accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
                  label="Choose a document or image"
                >
                  <template #prepend><q-icon name="attach_file" /></template>
                </q-file>
                <div v-if="form.attachmentUrl" class="attachment-hint">
                  An attachment is already saved. Choose a file to replace it.
                </div>
              </div>
              <q-banner v-if="dialogError" rounded class="error-banner">{{ dialogError }}</q-banner>
            </q-card-section>
            <q-separator />
            <q-card-actions align="right" class="dialog-actions">
              <q-btn flat no-caps label="Cancel" v-close-popup />
              <q-btn
                color="primary"
                unelevated
                no-caps
                type="submit"
                :loading="saving"
                :label="editing ? 'Save changes' : 'Create record'"
              />
            </q-card-actions>
          </q-form>
        </q-card>
      </q-dialog>

      <q-dialog v-model="submissionDialogOpen" persistent>
        <q-card class="form-dialog">
          <q-form @submit.prevent="submitAssignment">
            <q-card-section class="dialog-heading">
              <div>
                <div class="page-eyebrow">ASSIGNMENT SUBMISSION</div>
                <h2>{{ selectedAssignment?.title || 'Submit assignment' }}</h2>
              </div>
              <q-btn flat round dense icon="close" v-close-popup aria-label="Close dialog" />
            </q-card-section>
            <q-separator />
            <q-card-section class="dialog-fields">
              <div class="dialog-field">
                <label class="field-label">Choose your assignment file</label>
                <q-file
                  v-model="submissionFile"
                  outlined
                  dense
                  clearable
                  accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
                  :rules="[(file) => Boolean(file) || 'Choose a file to submit']"
                >
                  <template #prepend><q-icon name="attach_file" /></template>
                </q-file>
              </div>
              <q-banner v-if="submissionError" rounded class="error-banner">
                {{ submissionError }}
              </q-banner>
            </q-card-section>
            <q-separator />
            <q-card-actions align="right" class="dialog-actions">
              <q-btn flat no-caps label="Cancel" v-close-popup />
              <q-btn
                color="primary"
                unelevated
                no-caps
                type="submit"
                :loading="submitting"
                label="Upload and submit"
              />
            </q-card-actions>
          </q-form>
        </q-card>
      </q-dialog>
    </div>
  </q-page>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { apiRequest, downloadFile, pageable } from '@/services/api'
import { useAuthStore } from '@/stores/auth-store'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const $q = useQuasar()
const section = computed(() => route.params.section || 'overview')
const loading = ref(false)
const overviewLoading = ref(false)
const saving = ref(false)
const pageError = ref('')
const dialogError = ref('')
const rows = ref([])
const recentAnnouncements = ref([])
const courseOptions = ref([])
const peopleOptions = ref([])
const learnerOptions = ref([])
const selectedCourseId = ref(null)
const selectedLearnerId = ref(null)
const totalElements = ref(0)
const search = ref('')
const dialogOpen = ref(false)
const editing = ref(false)
const currentRecordId = ref(null)
const downloadingAssignmentId = ref(null)
const submissionDialogOpen = ref(false)
const submitting = ref(false)
const submissionError = ref('')
const selectedAssignment = ref(null)
const submissionFile = ref(null)
const assignmentFile = ref(null)
const form = reactive({})
const pagination = reactive({
  page: 1,
  rowsPerPage: 10,
  rowsNumber: 0,
  sortBy: '',
  descending: false,
})
const overviewCounts = reactive({ courses: 0, announcements: 0, people: 0, assignments: 0 })

const meta = {
  courses: {
    title: 'Courses',
    singular: 'Course',
    description: 'Explore the classes that bring your learning community together.',
    icon: 'auto_stories',
    createLabel: 'Add course',
    columns: [
      { name: 'name', label: 'COURSE', field: 'name', align: 'left', sortable: true },
      { name: 'code', label: 'COURSE CODE', field: 'code', align: 'left' },
      { name: 'teacherName', label: 'INSTRUCTOR', field: 'teacherName', align: 'left' },
      { name: 'term', label: 'SCHOOL YEAR', field: 'term', align: 'left' },
      { name: 'schoolTerm', label: 'TERM', field: 'schoolTerm', align: 'left' },
      { name: 'actions', label: '', field: 'actions', align: 'right' },
    ],
  },
  announcements: {
    title: 'Announcements',
    singular: 'Announcement',
    description: 'Important notes and updates for your school community.',
    icon: 'campaign',
    createLabel: 'New announcement',
    columns: [
      { name: 'title', label: 'ANNOUNCEMENT', field: 'title', align: 'left', sortable: true },
      {
        name: 'courseName',
        label: 'COURSE',
        field: (row) => row.courseName || 'School-wide',
        align: 'left',
      },
      { name: 'authorName', label: 'PUBLISHED BY', field: 'authorName', align: 'left' },
      { name: 'content', label: 'MESSAGE', field: 'content', align: 'left' },
      { name: 'createdAt', label: 'DATE', field: 'createdAt', align: 'left', format: formatDate },
      { name: 'actions', label: '', field: 'actions', align: 'right' },
    ],
  },
  assignments: {
    title: 'Assignments',
    singular: 'Assignment',
    description: 'Keep course work and upcoming due dates in view.',
    icon: 'assignment',
    createLabel: 'New assignment',
    columns: [
      { name: 'title', label: 'ASSIGNMENT', field: 'title', align: 'left', sortable: true },
      { name: 'courseName', label: 'COURSE', field: 'courseName', align: 'left' },
      { name: 'dueDate', label: 'DUE DATE', field: 'dueDate', align: 'left', format: formatDate },
      { name: 'maxScore', label: 'MAX SCORE', field: 'maxScore', align: 'left' },
      { name: 'attachmentUrl', label: 'ATTACHMENT', field: 'attachmentUrl', align: 'left' },
      { name: 'actions', label: '', field: 'actions', align: 'right' },
    ],
  },
  enrollments: {
    title: 'Enrollments',
    singular: 'Enrollment',
    description: 'View learners enrolled in a selected course.',
    icon: 'groups',
    createLabel: 'Enroll learner',
    columns: [
      { name: 'studentName', label: 'LEARNER', field: 'studentName', align: 'left' },
      { name: 'courseName', label: 'COURSE', field: 'courseName', align: 'left' },
      { name: 'grade', label: 'GRADE', field: 'grade', align: 'left' },
      {
        name: 'enrollmentAt',
        label: 'ENROLLED',
        field: 'enrollmentAt',
        align: 'left',
        format: formatDate,
      },
      { name: 'actions', label: '', field: 'actions', align: 'right' },
    ],
  },
  attendance: {
    title: 'Attendance',
    singular: 'Attendance record',
    description: 'Review attendance patterns by course and date.',
    icon: 'fact_check',
    createLabel: 'Record attendance',
    columns: [
      { name: 'studentName', label: 'LEARNER', field: 'studentName', align: 'left' },
      { name: 'courseName', label: 'COURSE', field: 'courseName', align: 'left' },
      { name: 'date', label: 'DATE', field: 'date', align: 'left', format: formatDate },
      { name: 'status', label: 'STATUS', field: 'status', align: 'left' },
      { name: 'actions', label: '', field: 'actions', align: 'right' },
    ],
  },
  users: {
    title: 'People',
    singular: 'Person',
    description: 'Manage learner, teacher, and school accounts.',
    icon: 'people_alt',
    createLabel: 'Add person',
    columns: [
      {
        name: 'firstName',
        label: 'NAME',
        field: (row) => `${row.firstName} ${row.lastName}`,
        align: 'left',
      },
      { name: 'email', label: 'EMAIL ADDRESS', field: 'email', align: 'left' },
      { name: 'role', label: 'ROLE', field: 'role', align: 'left' },
      { name: 'createdAt', label: 'JOINED', field: 'createdAt', align: 'left', format: formatDate },
    ],
  },
  submissions: {
    title: 'Submissions',
    singular: 'Submission',
    description: 'Review work submitted by an individual learner.',
    icon: 'task_alt',
    createLabel: '',
    columns: [
      { name: 'assignmentTitle', label: 'ASSIGNMENT', field: 'assignmentTitle', align: 'left' },
      { name: 'studentName', label: 'LEARNER', field: 'studentName', align: 'left' },
      {
        name: 'submittedAt',
        label: 'SUBMITTED',
        field: 'submittedAt',
        align: 'left',
        format: formatDate,
      },
      { name: 'grade', label: 'GRADE', field: (row) => row.grade ?? '—', align: 'left' },
      { name: 'status', label: 'STATUS', field: 'status', align: 'left' },
    ],
  },
}

const sectionMeta = computed(() => meta[section.value] || meta.courses)
const columns = computed(() => {
  const canAct = canCreate.value || canEdit.value || canDelete.value || canSubmitAssignment.value
  const baseColumns = sectionMeta.value.columns.filter(
    (column) => column.name !== 'actions' || canAct,
  )
  return canAct && !baseColumns.some((column) => column.name === 'actions')
    ? [...baseColumns, { name: 'actions', label: '', field: 'actions', align: 'right' }]
    : baseColumns
})
const canCreate = computed(() => {
  if (section.value === 'courses' || section.value === 'users') return auth.isAdmin
  if (section.value === 'announcements') return auth.isStaff
  return ['assignments', 'attendance', 'enrollments'].includes(section.value) && auth.isStaff
})
const canEdit = computed(
  () => auth.isStaff && ['assignments', 'attendance', 'enrollments'].includes(section.value),
)
const canSubmitAssignment = computed(
  () => auth.role === 'LEARNER' && section.value === 'assignments',
)
const canDelete = computed(
  () =>
    auth.isStaff &&
    ['announcements', 'assignments', 'attendance', 'enrollments'].includes(section.value),
)
const formFields = computed(() => getFormFields())
const courseSelectOptions = computed(() =>
  courseOptions.value.map((course) => ({
    ...course,
    label: `${course.name} · ${course.code}`,
  })),
)
const learnerSelectOptions = computed(() =>
  learnerOptions.value.map((person) => ({
    label: `${person.firstName} ${person.lastName}${person.email ? ` · ${person.email}` : ''}`,
    value: person.id,
  })),
)
const filteredRows = computed(() => {
  const query = search.value.trim().toLowerCase()
  if (!query) return rows.value
  return rows.value.filter((row) =>
    Object.values(row).some((value) =>
      String(value ?? '')
        .toLowerCase()
        .includes(query),
    ),
  )
})
const pageCount = computed(() =>
  Math.max(1, Math.ceil(totalElements.value / pagination.rowsPerPage)),
)
const rangeStart = computed(() =>
  totalElements.value ? (pagination.page - 1) * pagination.rowsPerPage + 1 : 0,
)
const rangeEnd = computed(() =>
  Math.min(pagination.page * pagination.rowsPerPage, totalElements.value),
)
const currentDate = new Intl.DateTimeFormat('en', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
})
  .format(new Date())
  .toUpperCase()
const greetingName = computed(() => auth.user?.email?.split('@')[0]?.split(/[._-]/)[0] || 'there')
const stats = computed(() => [
  {
    label: auth.role === 'LEARNER' ? 'My courses' : 'Total courses',
    value: overviewCounts.courses,
    detail: auth.role === 'LEARNER' ? 'Courses you are enrolled in' : 'Across all school terms',
    icon: 'auto_stories',
    tone: 'blue',
    section: 'courses',
  },
  {
    label: auth.role === 'LEARNER' ? 'My announcements' : 'Announcements',
    value: overviewCounts.announcements,
    detail: auth.role === 'LEARNER' ? 'For your courses and school' : 'Shared with the community',
    icon: 'campaign',
    tone: 'purple',
    section: 'announcements',
  },
  {
    label: 'People',
    value: auth.isAdmin ? overviewCounts.people : '—',
    detail: auth.isAdmin ? 'Learners and educators' : 'Admin access required',
    icon: 'groups',
    tone: 'green',
    section: auth.isAdmin ? 'users' : null,
  },
  {
    label: auth.role === 'LEARNER' ? 'My assignments' : 'Assignments',
    value: overviewCounts.assignments,
    detail: auth.role === 'LEARNER' ? 'Across your enrolled courses' : 'Across all courses',
    icon: 'assignment',
    tone: 'orange',
    section: 'assignments',
  },
])
const quickLinks = computed(() => [
  {
    section: 'courses',
    label: auth.role === 'LEARNER' ? 'My courses' : 'Browse courses',
    caption: auth.role === 'LEARNER' ? 'See your enrolled classes' : 'Find a class or instructor',
    icon: 'auto_stories',
  },
  {
    section: 'assignments',
    label: auth.role === 'LEARNER' ? 'My assignments' : 'Course assignments',
    caption: auth.role === 'LEARNER' ? 'See work for your courses' : 'See what is coming up',
    icon: 'assignment',
  },
  {
    section: 'announcements',
    label: auth.role === 'LEARNER' ? 'My announcements' : 'School announcements',
    caption: auth.role === 'LEARNER' ? 'Read relevant updates' : 'Read the latest updates',
    icon: 'campaign',
  },
])
const emptyMessage = computed(() => {
  if (['attendance', 'enrollments'].includes(section.value) && !selectedCourseId.value)
    return 'Choose a course above to get started.'
  if (section.value === 'submissions' && !selectedLearnerId.value)
    return 'Choose a learner above to load their submissions.'
  return `No ${sectionMeta.value.title.toLowerCase()} found.`
})

onMounted(async () => {
  try {
    await auth.ensureCurrentUser()
  } catch (error) {
    pageError.value = error.message || 'Could not load your account.'
    handleUnauthorized(error)
    return
  }
  if (auth.role === 'LEARNER') selectedLearnerId.value = auth.user.id
  await loadOptions()
  if (section.value === 'overview') await loadOverview()
  else await loadSection()
})
watch(section, async () => {
  pagination.page = 1
  pagination.sortBy = ''
  selectedCourseId.value = null
  rows.value = []
  totalElements.value = 0
  search.value = ''
  if (section.value === 'overview') await loadOverview()
  else await loadSection()
})

async function loadOptions() {
  try {
    courseOptions.value = await loadAllPages('/courses', 'name,asc')
  } catch (error) {
    pageError.value = error.message || 'Could not load course options.'
    handleUnauthorized(error)
  }
  if (auth.isAdmin) {
    try {
      peopleOptions.value = await loadAllPages('/users')
    } catch (error) {
      pageError.value = error.message || 'Could not load people options.'
      handleUnauthorized(error)
    }
  }
  if (auth.isStaff) {
    try {
      learnerOptions.value = await loadAllPages('/users/learners', 'lastName,asc')
    } catch (error) {
      pageError.value = error.message || 'Could not load learner options.'
      handleUnauthorized(error)
    }
  }
}

async function loadAllPages(endpoint, sort) {
  const content = []
  let page = 0
  let totalPages = 1

  while (page < totalPages) {
    const result = await apiRequest(endpoint, {
      token: auth.token,
      params: { page, size: 100, ...(sort ? { sort } : {}) },
    })
    content.push(...(result.content || []))
    totalPages = result.totalPages || 0
    page += 1
  }

  return content
}

async function loadOverview() {
  overviewLoading.value = true
  pageError.value = ''
  try {
    const [announcements, users, assignments] = await Promise.all([
      apiRequest('/announcements/', {
        token: auth.token,
        params: { page: 0, size: 5, sort: 'createdAt,desc' },
      }),
      auth.isAdmin
        ? apiRequest('/users', { token: auth.token, params: { page: 0, size: 1 } })
        : Promise.resolve(null),
      apiRequest('/assignments/count', { token: auth.token }),
    ])
    overviewCounts.courses = courseOptions.value.length
    overviewCounts.announcements = announcements.totalElements || 0
    overviewCounts.people = users?.totalElements || 0
    recentAnnouncements.value = announcements.content || []
    overviewCounts.assignments = assignments
  } catch (error) {
    pageError.value = error.message || 'Could not load overview.'
    handleUnauthorized(error)
  } finally {
    overviewLoading.value = false
  }
}

async function loadSection() {
  const currentSection = section.value
  pageError.value = ''
  if (['attendance', 'enrollments'].includes(currentSection) && !selectedCourseId.value) {
    rows.value = []
    totalElements.value = 0
    pagination.rowsNumber = 0
    return
  }
  if (currentSection === 'submissions' && auth.role === 'LEARNER') {
    selectedLearnerId.value = auth.user?.id
  }
  if (currentSection === 'submissions' && !selectedLearnerId.value) {
    rows.value = []
    totalElements.value = 0
    pagination.rowsNumber = 0
    return
  }
  loading.value = true
  const sort = pagination.sortBy
    ? `${pagination.sortBy},${pagination.descending ? 'desc' : 'asc'}`
    : defaultSort(currentSection)
  const params = pageable(pagination.page, pagination.rowsPerPage, sort)
  const endpoints = {
    courses: '/courses',
    announcements: '/announcements/',
    users: '/users',
    assignments: '/assignments',
    attendance: `/attendance/course/${selectedCourseId.value}`,
    enrollments: `/enrollments/course/${selectedCourseId.value}`,
    submissions: `/submissions/student/${selectedLearnerId.value}`,
  }
  try {
    const result = await apiRequest(endpoints[currentSection], { token: auth.token, params })
    rows.value = result.content || []
    totalElements.value = result.totalElements || 0
    pagination.rowsNumber = totalElements.value
  } catch (error) {
    pageError.value = error.message || `Could not load ${sectionMeta.value.title.toLowerCase()}.`
    handleUnauthorized(error)
  } finally {
    loading.value = false
  }
}

function defaultSort(currentSection) {
  return {
    courses: 'name,asc',
    announcements: 'createdAt,desc',
    assignments: 'dueDate,asc',
    attendance: 'date,desc',
    enrollments: 'enrolledAt,desc',
    submissions: 'submittedAt,desc',
  }[currentSection]
}

function onTableRequest({ pagination: requested }) {
  pagination.page = requested.page
  pagination.rowsPerPage = requested.rowsPerPage
  pagination.sortBy = requested.sortBy || ''
  pagination.descending = requested.descending
  loadSection()
}

function changePage(page) {
  pagination.page = page
  loadSection()
}

function changePageSize(size) {
  pagination.rowsPerPage = size
  pagination.page = 1
  loadSection()
}

function onCourseChanged() {
  pagination.page = 1
  loadSection()
}

function onLearnerChanged() {
  rows.value = []
  totalElements.value = 0
  pagination.rowsNumber = 0
  pagination.page = 1
}

function navigateToStat(stat) {
  if (stat.section) router.push(`/app/${stat.section}`)
}

function openCreate() {
  editing.value = false
  currentRecordId.value = null
  dialogError.value = ''
  assignmentFile.value = null
  Object.keys(form).forEach((key) => delete form[key])
  for (const field of formFields.value) form[field.key] = field.default ?? ''
  if (section.value === 'assignments') form.attachmentUrl = ''
  if (
    section.value === 'assignments' ||
    section.value === 'attendance' ||
    section.value === 'enrollments'
  ) {
    form.courseId = selectedCourseId.value
  }
  dialogOpen.value = true
}

function openEdit(record) {
  if (!canEdit.value) return
  editing.value = true
  currentRecordId.value = record.id
  dialogError.value = ''
  assignmentFile.value = null
  Object.keys(form).forEach((key) => delete form[key])
  const keys = formFields.value.map((field) => field.key)
  for (const key of keys) form[key] = record[key] ?? ''
  if (section.value === 'assignments') form.attachmentUrl = record.attachmentUrl || ''
  dialogOpen.value = true
}

function getFormFields() {
  const courseSelect = {
    key: 'courseId',
    label: 'Course',
    required: true,
    options: courseSelectOptions.value.map((course) => ({
      label: course.label,
      value: course.id,
    })),
  }
  const personSelect = (role, key = role === 'TEACHER' ? 'teacherId' : 'studentId') => {
    const people =
      role === 'LEARNER'
        ? learnerSelectOptions.value
        : peopleOptions.value
            .filter((person) => person.role === role)
            .map((person) => ({
              label: `${person.firstName} ${person.lastName}${person.email ? ` · ${person.email}` : ''}`,
              value: person.id,
            }))

    return {
      key,
      label: role === 'TEACHER' ? 'Instructor' : 'Learner',
      required: true,
      options: people,
    }
  }
  const gradeSelect = {
    key: 'grade',
    label: 'Grade level',
    required: true,
    options: ['Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'].map((value) => ({
      label: value,
      value,
    })),
  }
  return (
    {
      courses: [
        { key: 'name', label: 'Course name', required: true },
        { key: 'code', label: 'Course code', required: true },
        { key: 'description', label: 'Description', multiline: true },
        { key: 'term', label: 'School year', required: true, placeholder: '2026-2027' },
        {
          key: 'schoolTerm',
          label: 'Term',
          required: true,
          options: ['Term1', 'Term2', 'Term3', 'Term4'].map((value) => ({ label: value, value })),
        },
        personSelect('TEACHER'),
      ],
      announcements: [
        { key: 'title', label: 'Title', required: true },
        { key: 'content', label: 'Message', required: true, multiline: true },
        { ...courseSelect, required: false, label: 'Course (optional)' },
      ],
      assignments: [
        courseSelect,
        { key: 'title', label: 'Assignment title', required: true },
        { key: 'description', label: 'Description', required: true, multiline: true },
        { key: 'dueDate', label: 'Due date and time', type: 'datetime-local', required: true },
        { key: 'maxScore', label: 'Maximum score', type: 'number', required: true },
      ],
      enrollments: [courseSelect, personSelect('LEARNER'), gradeSelect],
      attendance: [
        courseSelect,
        personSelect('LEARNER'),
        { key: 'date', label: 'Date', type: 'date', required: true },
        {
          key: 'status',
          label: 'Status',
          required: true,
          options: ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'].map((value) => ({
            label: value,
            value,
          })),
        },
      ],
      users: [
        { key: 'firstName', label: 'First name', required: true },
        { key: 'lastName', label: 'Last name', required: true },
        { key: 'email', label: 'Email address', type: 'email', required: true },
        { key: 'password', label: 'Temporary password', type: 'password', required: true },
        {
          key: 'role',
          label: 'Role',
          required: true,
          options: ['LEARNER', 'TEACHER', 'PARENT', 'ADMIN'].map((value) => ({
            label: value,
            value,
          })),
        },
      ],
    }[section.value] || []
  )
}

function openSubmission(assignment) {
  selectedAssignment.value = assignment
  submissionFile.value = null
  submissionError.value = ''
  submissionDialogOpen.value = true
}

async function submitAssignment() {
  if (!selectedAssignment.value || !submissionFile.value) return

  submitting.value = true
  submissionError.value = ''
  try {
    const formData = new FormData()
    formData.append('file', submissionFile.value)
    const upload = await apiRequest('/submissions/uploads', {
      method: 'POST',
      token: auth.token,
      body: formData,
    })
    await apiRequest('/submissions', {
      method: 'POST',
      token: auth.token,
      body: {
        assignmentId: selectedAssignment.value.id,
        fileUrl: upload.fileUrl,
      },
    })
    submissionDialogOpen.value = false
    $q.notify({ type: 'positive', message: 'Assignment submitted', position: 'top-right' })
  } catch (error) {
    submissionError.value = error.message || 'Could not submit this assignment.'
    handleUnauthorized(error)
  } finally {
    submitting.value = false
  }
}

async function downloadAssignmentAttachment(assignment) {
  downloadingAssignmentId.value = assignment.id
  try {
    const file = await downloadFile(assignment.attachmentUrl, { token: auth.token })
    const extension = assignment.attachmentUrl.match(/\.[a-z0-9]+$/i)?.[0] || ''
    const objectUrl = URL.createObjectURL(file)
    const link = document.createElement('a')
    link.href = objectUrl
    link.download = `${assignment.title}${extension}`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: error.message || 'Could not download the assignment attachment.',
      position: 'top-right',
    })
    handleUnauthorized(error)
  } finally {
    downloadingAssignmentId.value = null
  }
}

async function saveRecord() {
  saving.value = true
  dialogError.value = ''
  const endpoint = {
    courses: '/courses',
    announcements: '/announcements/',
    assignments: '/assignments',
    enrollments: '/enrollments',
    attendance: '/attendance',
    users: '/users',
  }[section.value]
  const body = { ...form }
  if (body.courseId === '') body.courseId = null
  for (const key of ['courseId', 'studentId', 'teacherId', 'authorId', 'maxScore']) {
    if (body[key] !== undefined && body[key] !== '') body[key] = Number(body[key])
  }
  try {
    if (section.value === 'assignments' && assignmentFile.value) {
      const formData = new FormData()
      formData.append('file', assignmentFile.value)
      const upload = await apiRequest('/submissions/uploads', {
        method: 'POST',
        token: auth.token,
        body: formData,
      })
      body.attachmentUrl = upload.fileUrl
    }
    await apiRequest(editing.value ? `${endpoint}/${currentRecordId.value}` : endpoint, {
      method: editing.value ? 'PUT' : 'POST',
      token: auth.token,
      body,
    })
    dialogOpen.value = false
    $q.notify({
      type: 'positive',
      message: `${sectionMeta.value.singular} ${editing.value ? 'updated' : 'created'}`,
      position: 'top-right',
    })
    await loadOptions()
    await loadSection()
  } catch (error) {
    dialogError.value = error.message || 'Could not save this record.'
    handleUnauthorized(error)
  } finally {
    saving.value = false
  }
}

function confirmDelete(record) {
  $q.dialog({
    title: `Delete ${sectionMeta.value.singular.toLowerCase()}?`,
    message: 'This action cannot be undone.',
    cancel: { flat: true, label: 'Keep record', noCaps: true },
    ok: { color: 'negative', label: 'Delete', noCaps: true },
    persistent: true,
  }).onOk(async () => {
    try {
      const endpoint =
        section.value === 'announcements'
          ? '/announcements'
          : section.value === 'assignments'
            ? '/assignments'
            : section.value === 'attendance'
              ? '/attendance'
              : '/enrollments'
      await apiRequest(`${endpoint}/${record.id}`, { method: 'DELETE', token: auth.token })
      $q.notify({ type: 'positive', message: 'Record deleted', position: 'top-right' })
      if (rows.value.length === 1 && pagination.page > 1) pagination.page -= 1
      await loadSection()
    } catch (error) {
      $q.notify({
        type: 'negative',
        message: error.message || 'Could not delete record.',
        position: 'top-right',
      })
      handleUnauthorized(error)
    }
  })
}

function handleUnauthorized(error) {
  if (error.status === 401) {
    auth.logout()
    window.location.hash = '#/login'
  }
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(
    date,
  )
}

function statusClass(value) {
  return `status-badge status-${String(value || '').toLowerCase()}`
}
</script>

<template>
  <q-page class="workspace-page">
    <div class="page-content">
      <div class="page-heading">
        <div>
          <div class="page-eyebrow">LEARNING MATERIALS</div>
          <h1>Course notes</h1>
          <p>Browse notes for your courses or share study materials with your learners.</p>
        </div>
      </div>

      <q-banner v-if="pageError" rounded class="error-banner q-mb-md">
        {{ pageError }}
      </q-banner>

      <q-card flat bordered class="filter-card">
        <div class="filter-caption"><q-icon name="auto_stories" /> COURSE</div>
        <q-select
          v-model="selectedCourseId"
          :options="courseOptions"
          outlined
          dense
          emit-value
          map-options
          option-label="label"
          option-value="value"
          placeholder="Choose a course"
          class="course-filter"
          @update:model-value="loadResources"
        />
      </q-card>

      <q-card v-if="auth.role === 'TEACHER' && selectedCourseId" flat bordered class="notes-upload">
        <q-card-section>
          <h2>Upload course notes</h2>
          <p>Share a document with learners enrolled in this course (maximum 25 MB).</p>
          <q-form class="notes-upload-form" @submit.prevent="uploadNotes">
            <q-input
              v-model="uploadTitle"
              outlined
              label="Notes title"
              :rules="[(value) => Boolean(value?.trim()) || 'Enter a title']"
            />
            <q-file
              v-model="uploadFile"
              outlined
              clearable
              label="Choose a document"
              accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.rtf,.png,.jpg,.jpeg"
              :max-file-size="25 * 1024 * 1024"
              :rules="[(value) => Boolean(value) || 'Choose a file']"
              @rejected="onFileRejected"
            >
              <template #prepend><q-icon name="attach_file" /></template>
            </q-file>
            <q-banner v-if="uploadError" rounded class="error-banner">
              {{ uploadError }}
            </q-banner>
            <q-btn
              color="primary"
              unelevated
              no-caps
              type="submit"
              label="Upload notes"
              icon="upload_file"
              :loading="uploading"
              :disable="!uploadFile || !uploadTitle.trim()"
            />
          </q-form>
        </q-card-section>
      </q-card>

      <q-card flat bordered class="notes-list-card">
        <q-card-section class="notes-list-heading">
          <div>
            <h2>{{ selectedCourseName || 'Course materials' }}</h2>
            <p>{{ resources.length }} shared {{ resources.length === 1 ? 'file' : 'files' }}</p>
          </div>
          <q-btn flat round dense icon="refresh" aria-label="Refresh notes" @click="loadResources" />
        </q-card-section>
        <q-separator />
        <q-inner-loading :showing="loading">
          <q-spinner-dots color="primary" size="36px" />
        </q-inner-loading>
        <div v-if="!loading && !selectedCourseId" class="notes-empty">
          Choose a course to see its notes.
        </div>
        <div v-else-if="!loading && !resources.length" class="notes-empty">
          No notes have been uploaded for this course yet.
        </div>
        <q-list v-else separator>
          <q-item v-for="resource in resources" :key="resource.id" class="notes-resource-row">
            <q-item-section avatar>
              <q-avatar color="blue-1" text-color="primary" icon="description" />
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ resource.title }}</q-item-label>
              <q-item-label caption>
                {{ resource.originalFilename }} · {{ formatDate(resource.uploadedAt) }}
              </q-item-label>
            </q-item-section>
            <q-item-section side>
              <div class="notes-row-actions">
                <q-btn
                  flat
                  round
                  dense
                  icon="download"
                  aria-label="Download notes"
                  :loading="downloadingId === resource.id"
                  @click="downloadNotes(resource)"
                />
                <q-btn
                  v-if="canDelete"
                  flat
                  round
                  dense
                  color="negative"
                  icon="delete_outline"
                  aria-label="Delete notes"
                  :loading="deletingId === resource.id"
                  @click="deleteNotes(resource)"
                />
              </div>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card>
    </div>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { apiRequest, downloadFile } from '@/services/api'
import { useAuthStore } from '@/stores/auth-store'

const auth = useAuthStore()
const $q = useQuasar()
const courseOptions = ref([])
const selectedCourseId = ref(null)
const resources = ref([])
const loading = ref(false)
const uploading = ref(false)
const uploadTitle = ref('')
const uploadFile = ref(null)
const uploadError = ref('')
const pageError = ref('')
const downloadingId = ref(null)
const deletingId = ref(null)
const canDelete = computed(() => ['TEACHER', 'ADMIN'].includes(auth.role))
const selectedCourseName = computed(
  () => courseOptions.value.find((course) => course.value === selectedCourseId.value)?.label || '',
)

onMounted(loadCourses)

async function loadCourses() {
  pageError.value = ''
  try {
    const result =
      auth.role === 'TEACHER'
        ? await apiRequest('/quizzes/courses', { token: auth.token })
        : await apiRequest('/courses', {
            token: auth.token,
            params: { page: 0, size: 100, sort: 'name,asc' },
          }).then((page) => page.content || [])
    courseOptions.value = result.map((course) => ({
      label: `${course.name} (${course.code})`,
      value: course.id,
    }))
    selectedCourseId.value = courseOptions.value[0]?.value || null
    if (selectedCourseId.value) await loadResources()
  } catch (error) {
    pageError.value = error.message || 'Could not load courses.'
    handleUnauthorized(error)
  }
}

async function loadResources() {
  if (!selectedCourseId.value) {
    resources.value = []
    return
  }
  loading.value = true
  pageError.value = ''
  resources.value = []
  try {
    resources.value = await apiRequest(`/courses/${selectedCourseId.value}/resources`, {
      token: auth.token,
    })
  } catch (error) {
    pageError.value = error.message || 'Could not load course notes.'
    handleUnauthorized(error)
  } finally {
    loading.value = false
  }
}

async function uploadNotes() {
  uploadError.value = ''
  if (!uploadFile.value || !uploadTitle.value.trim()) return
  const formData = new FormData()
  formData.append('title', uploadTitle.value.trim())
  formData.append('file', uploadFile.value)
  uploading.value = true
  try {
    await apiRequest(`/courses/${selectedCourseId.value}/resources`, {
      method: 'POST',
      token: auth.token,
      body: formData,
    })
    uploadTitle.value = ''
    uploadFile.value = null
    $q.notify({ type: 'positive', message: 'Course notes uploaded', position: 'top-right' })
    await loadResources()
  } catch (error) {
    uploadError.value = error.message || 'Could not upload these notes.'
    handleUnauthorized(error)
  } finally {
    uploading.value = false
  }
}

async function downloadNotes(resource) {
  downloadingId.value = resource.id
  try {
    const blob = await downloadFile(resource.downloadUrl, { token: auth.token })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = resource.originalFilename
    anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: error.message || 'Could not download these notes.',
      position: 'top-right',
    })
    handleUnauthorized(error)
  } finally {
    downloadingId.value = null
  }
}

function deleteNotes(resource) {
  $q.dialog({
    title: 'Remove course notes?',
    message: `“${resource.title}” will no longer be available to learners.`,
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    deletingId.value = resource.id
    try {
      await apiRequest(`/course-resources/${resource.id}`, {
        method: 'DELETE',
        token: auth.token,
      })
      await loadResources()
      $q.notify({ type: 'positive', message: 'Course notes removed', position: 'top-right' })
    } catch (error) {
      $q.notify({
        type: 'negative',
        message: error.message || 'Could not remove these notes.',
        position: 'top-right',
      })
      handleUnauthorized(error)
    } finally {
      deletingId.value = null
    }
  })
}

function onFileRejected() {
  uploadError.value = 'Choose a supported file smaller than 25 MB.'
}

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value))
}

function handleUnauthorized(error) {
  if (error.status === 401) {
    auth.logout()
    window.location.hash = '#/login'
  }
}
</script>

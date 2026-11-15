<template>
  <q-page class="workspace-page">
    <div class="page-content quiz-page">
      <div class="page-heading">
        <div>
          <div class="page-eyebrow">COURSE WORK</div>
          <h1>Online quizzes</h1>
          <p>Take scheduled quizzes or review learner submissions.</p>
        </div>
        <q-btn
          v-if="auth.role === 'TEACHER'"
          color="primary"
          unelevated
          no-caps
          icon="add"
          label="Create quiz"
          @click="openCreateDialog"
        />
      </div>

      <q-banner v-if="pageError" rounded class="error-banner q-mb-md">
        {{ pageError }}
      </q-banner>
      <div v-if="loading" class="quiz-loading">
        <q-spinner-dots color="primary" size="38px" />
      </div>
      <div v-else-if="!quizzes.length" class="quiz-empty">
        <q-icon name="quiz" />
        <strong>No quizzes yet</strong>
        <span>Quizzes for your courses will appear here.</span>
      </div>
      <div v-else class="quiz-list">
        <q-card v-for="quiz in quizzes" :key="quiz.id" flat bordered class="quiz-card">
          <q-card-section class="quiz-card-heading">
            <div>
              <div class="quiz-course">{{ quiz.courseName }}</div>
              <h2>{{ quiz.title }}</h2>
              <p v-if="quiz.description">{{ quiz.description }}</p>
            </div>
            <q-badge rounded :color="quizBadge(quiz).color" :label="quizBadge(quiz).label" />
          </q-card-section>
          <q-separator />
          <q-card-section class="quiz-card-details">
            <span><q-icon name="schedule" /> Opens {{ formatDateTime(quiz.opensAt) }}</span>
            <span><q-icon name="event" /> Closes {{ formatDateTime(quiz.closesAt) }}</span>
            <span><q-icon name="star_outline" /> {{ quiz.totalPoints }} points</span>
          </q-card-section>
          <q-card-actions align="right">
            <template v-if="auth.role === 'LEARNER'">
              <span v-if="quiz.myAttemptStatus === 'GRADED'" class="quiz-grade">
                Grade: {{ quiz.myGrade }} / {{ quiz.totalPoints }}
              </span>
              <span v-if="quiz.myFeedback" class="quiz-grade-feedback">{{ quiz.myFeedback }}</span>
              <q-btn
                v-if="quiz.myAttemptStatus === 'SUBMITTED'"
                flat
                no-caps
                label="Submitted — awaiting grade"
                disable
              />
              <q-btn
                v-else-if="!quiz.myAttemptId && isOpen(quiz)"
                color="primary"
                unelevated
                no-caps
                label="Take quiz"
                @click="openQuiz(quiz)"
              />
              <q-btn
                v-else-if="!quiz.myAttemptId"
                flat
                no-caps
                :label="isUpcoming(quiz) ? 'Not open yet' : 'Quiz closed'"
                disable
              />
            </template>
            <template v-else>
              <q-btn
                color="primary"
                flat
                no-caps
                icon="fact_check"
                label="Review submissions"
                :loading="loadingQuizId === quiz.id"
                @click="openAttempts(quiz)"
              />
            </template>
          </q-card-actions>
        </q-card>
      </div>
    </div>

    <q-dialog v-model="createDialogOpen" persistent>
      <q-card class="quiz-dialog">
        <q-form @submit.prevent="createQuiz">
          <q-card-section class="quiz-dialog-heading">
            <div>
              <div class="page-eyebrow">TEACHER TOOLS</div>
              <h2>Create a quiz</h2>
            </div>
            <q-btn flat round dense icon="close" v-close-popup aria-label="Close dialog" />
          </q-card-section>
          <q-separator />
          <q-card-section class="quiz-dialog-fields">
            <q-select
              v-model="quizForm.courseId"
              :options="courseOptions"
              label="Course"
              outlined
              emit-value
              map-options
              :rules="[(value) => Boolean(value) || 'Choose a course']"
            />
            <q-input
              v-model="quizForm.title"
              label="Quiz title"
              outlined
              :rules="[(value) => Boolean(value?.trim()) || 'Enter a quiz title']"
            />
            <q-input
              v-model="quizForm.description"
              label="Instructions (optional)"
              type="textarea"
              autogrow
              outlined
            />
            <div class="quiz-time-grid">
              <q-input
                v-model="quizForm.opensAt"
                label="Opens at"
                type="datetime-local"
                outlined
                :rules="[(value) => Boolean(value) || 'Choose when the quiz opens']"
              />
              <q-input
                v-model="quizForm.closesAt"
                label="Closes at"
                type="datetime-local"
                outlined
                :rules="[(value) => Boolean(value) || 'Choose when the quiz closes']"
              />
            </div>
            <div class="quiz-questions-heading">
              <strong>Written-response questions</strong>
              <q-btn flat dense no-caps icon="add" label="Add question" @click="addQuestion" />
            </div>
            <div
              v-for="(question, index) in quizForm.questions"
              :key="index"
              class="quiz-question-editor"
            >
              <q-input
                v-model="question.prompt"
                :label="`Question ${index + 1}`"
                type="textarea"
                autogrow
                outlined
                :rules="[(value) => Boolean(value?.trim()) || 'Enter a question']"
              />
              <q-input
                v-model.number="question.maxPoints"
                label="Points"
                type="number"
                min="1"
                step="any"
                outlined
                :rules="[(value) => Number(value) > 0 || 'Points must be greater than zero']"
              />
              <q-btn
                v-if="quizForm.questions.length > 1"
                flat
                round
                dense
                color="negative"
                icon="delete_outline"
                aria-label="Remove question"
                @click="quizForm.questions.splice(index, 1)"
              />
            </div>
            <q-banner v-if="createError" rounded class="error-banner">{{ createError }}</q-banner>
          </q-card-section>
          <q-separator />
          <q-card-actions align="right" class="quiz-dialog-actions">
            <q-btn flat no-caps label="Cancel" v-close-popup />
            <q-btn
              color="primary"
              unelevated
              no-caps
              type="submit"
              :loading="creating"
              label="Create quiz"
            />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>

    <q-dialog v-model="takeDialogOpen" persistent>
      <q-card class="quiz-dialog">
        <q-form @submit.prevent="submitQuiz">
          <q-card-section class="quiz-dialog-heading">
            <div>
              <div class="page-eyebrow">{{ selectedQuiz?.courseName }}</div>
              <h2>{{ selectedQuiz?.title }}</h2>
              <p>{{ selectedQuiz?.description }}</p>
            </div>
            <q-btn flat round dense icon="close" v-close-popup aria-label="Close quiz" />
          </q-card-section>
          <q-separator />
          <q-card-section class="quiz-dialog-fields">
            <div
              v-for="(question, index) in selectedQuiz?.questions || []"
              :key="question.id"
              class="quiz-answer-field"
            >
              <label
                >Question {{ index + 1 }} <span>{{ question.maxPoints }} points</span></label
              >
              <p>{{ question.prompt }}</p>
              <q-input
                v-model="answers[question.id]"
                type="textarea"
                autogrow
                outlined
                placeholder="Write your answer"
                :rules="[(value) => Boolean(value?.trim()) || 'Answer this question']"
              />
            </div>
            <q-banner v-if="takeError" rounded class="error-banner">{{ takeError }}</q-banner>
          </q-card-section>
          <q-separator />
          <q-card-actions align="right" class="quiz-dialog-actions">
            <q-btn flat no-caps label="Cancel" v-close-popup />
            <q-btn
              color="primary"
              unelevated
              no-caps
              type="submit"
              :loading="submitting"
              label="Submit quiz"
            />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>

    <q-dialog v-model="attemptsDialogOpen">
      <q-card class="quiz-dialog attempts-dialog">
        <q-card-section class="quiz-dialog-heading">
          <div>
            <div class="page-eyebrow">TEACHER TOOLS</div>
            <h2>{{ selectedQuiz?.title }} submissions</h2>
          </div>
          <q-btn flat round dense icon="close" v-close-popup aria-label="Close submissions" />
        </q-card-section>
        <q-separator />
        <q-card-section class="quiz-dialog-fields">
          <div v-if="!attempts.length" class="quiz-empty compact">
            <strong>No submissions yet</strong>
            <span>Learner work will appear here after submission.</span>
          </div>
          <q-card v-for="attempt in attempts" :key="attempt.id" flat bordered class="attempt-card">
            <q-card-section>
              <div class="attempt-heading">
                <div>
                  <strong>{{ attempt.learnerName }}</strong>
                  <span>{{ formatDateTime(attempt.submittedAt) }}</span>
                </div>
                <q-badge
                  rounded
                  :color="attempt.status === 'GRADED' ? 'positive' : 'orange'"
                  :label="attempt.status"
                />
              </div>
              <div
                v-for="(answer, index) in attempt.answers"
                :key="answer.questionId"
                class="attempt-answer"
              >
                <strong
                  >Q{{ index + 1 }} · {{ answer.prompt }} ({{ answer.maxPoints }} points)</strong
                >
                <p>{{ answer.responseText }}</p>
              </div>
              <div v-if="attempt.status === 'GRADED'" class="graded-result">
                Grade: {{ attempt.grade }} / {{ selectedQuiz?.totalPoints }}
                <p v-if="attempt.feedback">{{ attempt.feedback }}</p>
              </div>
              <div v-else class="grade-form">
                <q-input
                  v-model.number="gradeForms[attempt.id].grade"
                  label="Grade"
                  type="number"
                  min="0"
                  :max="selectedQuiz?.totalPoints"
                  step="any"
                  outlined
                  dense
                />
                <q-input
                  v-model="gradeForms[attempt.id].feedback"
                  label="Feedback (optional)"
                  type="textarea"
                  autogrow
                  outlined
                  dense
                />
                <q-btn
                  color="primary"
                  unelevated
                  no-caps
                  label="Save grade"
                  :loading="gradingAttemptId === attempt.id"
                  @click="gradeAttempt(attempt)"
                />
              </div>
              <q-banner v-if="attemptErrors[attempt.id]" dense rounded class="error-banner q-mt-sm">
                {{ attemptErrors[attempt.id] }}
              </q-banner>
            </q-card-section>
          </q-card>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useQuasar } from 'quasar'
import { apiRequest } from '@/services/api'
import { useAuthStore } from '@/stores/auth-store'

const auth = useAuthStore()
const $q = useQuasar()
const quizzes = ref([])
const courseOptions = ref([])
const loading = ref(false)
const loadingQuizId = ref(null)
const pageError = ref('')
const createDialogOpen = ref(false)
const creating = ref(false)
const createError = ref('')
const quizForm = reactive({
  courseId: null,
  title: '',
  description: '',
  opensAt: toDateTimeInput(new Date()),
  closesAt: toDateTimeInput(new Date(Date.now() + 60 * 60 * 1000)),
  questions: [{ prompt: '', maxPoints: 10 }],
})
const takeDialogOpen = ref(false)
const selectedQuiz = ref(null)
const answers = reactive({})
const submitting = ref(false)
const takeError = ref('')
const attemptsDialogOpen = ref(false)
const attempts = ref([])
const gradeForms = reactive({})
const attemptErrors = reactive({})
const gradingAttemptId = ref(null)

onMounted(loadPage)

async function loadPage() {
  loading.value = true
  pageError.value = ''
  try {
    const requests = [apiRequest('/quizzes', { token: auth.token })]
    if (auth.role === 'TEACHER') {
      requests.push(apiRequest('/quizzes/courses', { token: auth.token }))
    }
    const [quizResults, courseResults] = await Promise.all(requests)
    quizzes.value = quizResults
    courseOptions.value = (courseResults || []).map((course) => ({
      label: `${course.name} (${course.code})`,
      value: course.id,
    }))
  } catch (error) {
    pageError.value = error.message || 'Could not load quizzes.'
    handleUnauthorized(error)
  } finally {
    loading.value = false
  }
}

function openCreateDialog() {
  createError.value = ''
  quizForm.courseId = courseOptions.value[0]?.value || null
  quizForm.title = ''
  quizForm.description = ''
  quizForm.opensAt = toDateTimeInput(new Date())
  quizForm.closesAt = toDateTimeInput(new Date(Date.now() + 60 * 60 * 1000))
  quizForm.questions.splice(0, quizForm.questions.length, { prompt: '', maxPoints: 10 })
  createDialogOpen.value = true
}

function addQuestion() {
  quizForm.questions.push({ prompt: '', maxPoints: 10 })
}

async function createQuiz() {
  createError.value = ''
  if (
    !quizForm.questions.length ||
    quizForm.questions.some((question) => !question.prompt.trim())
  ) {
    createError.value = 'Add at least one question and complete every question prompt.'
    return
  }
  if (new Date(quizForm.closesAt) <= new Date(quizForm.opensAt)) {
    createError.value = 'The closing time must be after the opening time.'
    return
  }
  creating.value = true
  try {
    await apiRequest('/quizzes', {
      method: 'POST',
      token: auth.token,
      body: {
        ...quizForm,
        opensAt: new Date(quizForm.opensAt).toISOString(),
        closesAt: new Date(quizForm.closesAt).toISOString(),
        questions: quizForm.questions.map((question) => ({
          prompt: question.prompt,
          maxPoints: Number(question.maxPoints),
        })),
      },
    })
    createDialogOpen.value = false
    $q.notify({ type: 'positive', message: 'Quiz created', position: 'top-right' })
    await loadPage()
  } catch (error) {
    createError.value = error.message || 'Could not create the quiz.'
    handleUnauthorized(error)
  } finally {
    creating.value = false
  }
}

async function openQuiz(quiz) {
  takeError.value = ''
  try {
    selectedQuiz.value = await apiRequest(`/quizzes/${quiz.id}`, { token: auth.token })
    Object.keys(answers).forEach((key) => delete answers[key])
    selectedQuiz.value.questions.forEach((question) => {
      answers[question.id] = ''
    })
    takeDialogOpen.value = true
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: error.message || 'Could not open this quiz.',
      position: 'top-right',
    })
    handleUnauthorized(error)
  }
}

async function submitQuiz() {
  if (!selectedQuiz.value) return
  takeError.value = ''
  submitting.value = true
  try {
    await apiRequest(`/quizzes/${selectedQuiz.value.id}/attempts`, {
      method: 'POST',
      token: auth.token,
      body: {
        answers: selectedQuiz.value.questions.map((question) => ({
          questionId: question.id,
          responseText: answers[question.id],
        })),
      },
    })
    takeDialogOpen.value = false
    $q.notify({ type: 'positive', message: 'Quiz submitted', position: 'top-right' })
    await loadPage()
  } catch (error) {
    takeError.value = error.message || 'Could not submit the quiz.'
    handleUnauthorized(error)
  } finally {
    submitting.value = false
  }
}

async function openAttempts(quiz) {
  selectedQuiz.value = quiz
  loadingQuizId.value = quiz.id
  try {
    attempts.value = await apiRequest(`/quizzes/${quiz.id}/attempts`, { token: auth.token })
    Object.keys(gradeForms).forEach((key) => delete gradeForms[key])
    Object.keys(attemptErrors).forEach((key) => delete attemptErrors[key])
    attempts.value.forEach((attempt) => {
      gradeForms[attempt.id] = { grade: '', feedback: '' }
    })
    attemptsDialogOpen.value = true
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: error.message || 'Could not load quiz submissions.',
      position: 'top-right',
    })
    handleUnauthorized(error)
  } finally {
    loadingQuizId.value = null
  }
}

async function gradeAttempt(attempt) {
  const form = gradeForms[attempt.id]
  attemptErrors[attempt.id] = ''
  const grade = Number(form.grade)
  if (
    form.grade === '' ||
    form.grade === null ||
    !Number.isFinite(grade) ||
    grade < 0 ||
    grade > selectedQuiz.value.totalPoints
  ) {
    attemptErrors[attempt.id] = `Enter a grade from 0 to ${selectedQuiz.value.totalPoints}.`
    return
  }
  gradingAttemptId.value = attempt.id
  try {
    const updated = await apiRequest(`/quizzes/attempts/${attempt.id}/grade`, {
      method: 'PUT',
      token: auth.token,
      body: { grade, feedback: form.feedback },
    })
    attempts.value = attempts.value.map((row) => (row.id === updated.id ? updated : row))
    await loadPage()
    $q.notify({ type: 'positive', message: 'Grade saved', position: 'top-right' })
  } catch (error) {
    attemptErrors[attempt.id] = error.message || 'Could not save this grade.'
    handleUnauthorized(error)
  } finally {
    gradingAttemptId.value = null
  }
}

function quizBadge(quiz) {
  if (auth.role !== 'LEARNER') return { label: 'Teacher quiz', color: 'primary' }
  if (quiz.myAttemptStatus === 'GRADED') return { label: 'Graded', color: 'positive' }
  if (quiz.myAttemptStatus === 'SUBMITTED') return { label: 'Submitted', color: 'orange' }
  if (isUpcoming(quiz)) return { label: 'Upcoming', color: 'grey' }
  if (isOpen(quiz)) return { label: 'Open', color: 'primary' }
  return { label: 'Closed', color: 'grey' }
}

function isOpen(quiz) {
  const now = Date.now()
  return now >= new Date(quiz.opensAt).getTime() && now <= new Date(quiz.closesAt).getTime()
}

function isUpcoming(quiz) {
  return Date.now() < new Date(quiz.opensAt).getTime()
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function toDateTimeInput(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

function handleUnauthorized(error) {
  if (error.status === 401) {
    auth.logout()
    window.location.hash = '#/login'
  }
}
</script>

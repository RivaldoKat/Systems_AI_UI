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
                v-if="quiz.myAttemptId && !isOpen(quiz) && !isUpcoming(quiz)"
                flat
                no-caps
                label="Review answers"
                @click="openReview(quiz)"
              />
              <q-btn
                v-if="quiz.myAttemptStatus === 'SUBMITTED'"
                flat
                no-caps
                :label="learnerSubmissionLabel(quiz)"
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
              <strong>Questions</strong>
              <q-btn flat dense no-caps icon="add" label="Add question" @click="addQuestion" />
            </div>
            <div
              v-for="(question, index) in quizForm.questions"
              :key="index"
              class="quiz-question-editor"
            >
              <div class="quiz-question-fields">
                <q-input
                  v-model="question.prompt"
                  :label="`Question ${index + 1}`"
                  type="textarea"
                  autogrow
                  outlined
                  :rules="[(value) => Boolean(value?.trim()) || 'Enter a question']"
                />
                <q-select
                  v-model="question.questionType"
                  :options="questionTypes"
                  label="Question type"
                  outlined
                  emit-value
                  map-options
                  @update:model-value="onQuestionTypeChange(question)"
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
                  @click="removeQuestion(index)"
                />
              </div>
              <div class="quiz-question-image">
                <q-file
                  v-model="question.imageFile"
                  outlined
                  dense
                  clearable
                  accept="image/png,image/jpeg,image/gif,image/webp"
                  :max-file-size="10 * 1024 * 1024"
                  label="Add a diagram or image (optional)"
                  @update:model-value="uploadQuestionImage(question, $event)"
                  @rejected="createError = 'Choose a PNG, JPEG, GIF, or WEBP image under 10 MB.'"
                >
                  <template #prepend><q-icon name="image" /></template>
                </q-file>
                <q-spinner v-if="question.imageUploading" color="primary" />
                <q-img
                  v-if="question.imagePreview"
                  :src="question.imagePreview"
                  fit="contain"
                  class="quiz-question-image-preview"
                />
              </div>
              <div v-if="question.questionType === 'MULTIPLE_CHOICE'" class="quiz-option-editor">
                <div
                  v-for="(option, optionIndex) in question.options"
                  :key="optionIndex"
                  class="quiz-option-row"
                >
                  <q-radio
                    v-model="question.correctOptionIndex"
                    :val="optionIndex"
                    :label="`Correct`"
                    color="positive"
                  />
                  <q-input
                    v-model="question.options[optionIndex]"
                    :label="`Option ${optionIndex + 1}`"
                    outlined
                    dense
                    :rules="[(value) => Boolean(value?.trim()) || 'Enter an option']"
                  />
                  <q-btn
                    v-if="question.options.length > 2"
                    flat
                    round
                    dense
                    color="negative"
                    icon="close"
                    aria-label="Remove option"
                    @click="removeOption(question, optionIndex)"
                  />
                </div>
                <q-btn
                  flat
                  dense
                  no-caps
                  icon="add"
                  label="Add answer option"
                  @click="question.options.push('')"
                />
              </div>
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
            <q-btn
              flat
              round
              dense
              icon="close"
              :disable="!reviewMode && !quizExpired"
              v-close-popup
              aria-label="Close quiz"
            />
          </q-card-section>
          <q-separator />
          <q-card-section class="quiz-dialog-fields">
            <q-banner
              v-if="!reviewMode"
              rounded
              class="quiz-timer"
              :class="{ expired: quizExpired }"
            >
              <q-icon name="timer" />
              <strong v-if="!quizExpired">
                Time remaining: {{ formatRemainingTime(remainingSeconds) }}
              </strong>
              <strong v-else>Time is up — submitting your answers…</strong>
            </q-banner>
            <q-banner
              v-if="selectedQuiz?.questions?.some((question) => question.questionType === 'MULTIPLE_CHOICE' && !question.options?.length)"
              rounded
              class="error-banner"
            >
              Some multiple-choice options could not be loaded. Close the quiz and try again.
            </q-banner>
            <div
              v-for="(question, index) in selectedQuiz?.questions || []"
              :key="question.id"
              class="quiz-answer-field"
            >
              <label
                >Question {{ index + 1 }} <span>{{ question.maxPoints }} points</span></label
              >
              <p>{{ question.prompt }}</p>
              <q-img
                v-if="imageSources[question.id]"
                :src="imageSources[question.id]"
                fit="contain"
                class="quiz-question-image-preview"
              />
              <q-banner v-if="imageErrors[question.id]" dense rounded class="error-banner">
                {{ imageErrors[question.id] }}
              </q-banner>
              <div v-if="question.questionType === 'MULTIPLE_CHOICE'" class="quiz-answer-options">
                <q-radio
                  v-for="option in question.options || []"
                  :key="option.id"
                  v-model="answers[question.id]"
                  :val="option.id"
                  :label="optionLabel(question, option)"
                  :disable="reviewMode || quizExpired"
                  color="primary"
                />
              </div>
              <q-input
                v-else
                v-model="answers[question.id]"
                type="textarea"
                autogrow
                outlined
                placeholder="Write your answer"
                :disable="reviewMode || quizExpired"
                :rules="[(value) => Boolean(value?.trim()) || 'Answer this question']"
              />
              <div v-if="reviewMode && question.questionType === 'WRITTEN'" class="quiz-review-answer">
                Your response: {{ answers[question.id] || 'No response' }}
              </div>
            </div>
            <q-banner v-if="takeError" rounded class="error-banner">{{ takeError }}</q-banner>
            <q-btn
              v-if="quizExpired && takeError"
              color="primary"
              unelevated
              no-caps
              label="Retry auto-submit"
              :loading="submitting"
              @click="submitQuiz(true)"
            />
          </q-card-section>
          <q-separator />
          <q-card-actions align="right" class="quiz-dialog-actions">
            <q-btn
              v-if="reviewMode"
              flat
              no-caps
              label="Close"
              v-close-popup
            />
            <q-btn
              v-if="!reviewMode && !quizExpired"
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
                <p v-if="answer.questionType === 'MULTIPLE_CHOICE'">
                  Selected: {{ answer.selectedOptionText || 'No selection' }}
                  <span v-if="answer.correctOptionText">
                    · Correct: {{ answer.correctOptionText }}
                    · {{ answer.selectedOptionId === answer.correctOptionId ? 'Correct' : 'Incorrect' }}
                  </span>
                </p>
                <p v-else>{{ answer.responseText }}</p>
              </div>
              <div v-if="attempt.status === 'GRADED'" class="graded-result">
                Grade: {{ attempt.grade }} / {{ selectedQuiz?.totalPoints }}
                <span v-if="attempt.answers.some((answer) => answer.questionType === 'MULTIPLE_CHOICE')">
                  · Auto-scored {{ attempt.autoGradedPoints }} points
                </span>
                <p v-if="attempt.feedback">{{ attempt.feedback }}</p>
              </div>
              <div v-else class="grade-form">
                <p>Auto-scored {{ attempt.autoGradedPoints }} points. Enter the final score.</p>
                <q-input
                  v-model.number="gradeForms[attempt.id].grade"
                  label="Grade"
                  type="number"
                  :min="attempt.autoGradedPoints"
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
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useQuasar } from 'quasar'
import { apiRequest, downloadFile } from '@/services/api'
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
const questionTypes = [
  { label: 'Written response', value: 'WRITTEN' },
  { label: 'Multiple choice', value: 'MULTIPLE_CHOICE' },
]
const quizForm = reactive({
  courseId: null,
  title: '',
  description: '',
  opensAt: toDateTimeInput(new Date()),
  closesAt: toDateTimeInput(new Date(Date.now() + 60 * 60 * 1000)),
  questions: [newQuestion()],
})
const takeDialogOpen = ref(false)
const selectedQuiz = ref(null)
const answers = reactive({})
const imageSources = reactive({})
const imageErrors = reactive({})
const submitting = ref(false)
const takeError = ref('')
const remainingSeconds = ref(0)
const quizExpired = ref(false)
const reviewMode = ref(false)
let countdownInterval = null
let timeoutSubmissionPending = false
const attemptsDialogOpen = ref(false)
const attempts = ref([])
const gradeForms = reactive({})
const attemptErrors = reactive({})
const gradingAttemptId = ref(null)

onMounted(loadPage)
onBeforeUnmount(() => {
  stopCountdown()
  clearQuestionImages()
  clearQuizFormImages()
})

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
  clearQuizFormImages()
  quizForm.questions.splice(0, quizForm.questions.length, newQuestion())
  createDialogOpen.value = true
}

function addQuestion() {
  quizForm.questions.push(newQuestion())
}

function newQuestion() {
  return {
    prompt: '',
    maxPoints: 10,
    questionType: 'WRITTEN',
    options: ['', '', '', ''],
    correctOptionIndex: 0,
    imageFile: null,
    imageUrl: null,
    imagePreview: null,
    imageUploading: false,
  }
}

async function uploadQuestionImage(question, file) {
  if (!file) {
    if (question.imagePreview) URL.revokeObjectURL(question.imagePreview)
    question.imagePreview = null
    question.imageUrl = null
    return
  }
  if (file.size > 10 * 1024 * 1024) {
    createError.value = 'Choose an image under 10 MB.'
    return
  }
  if (question.imagePreview) URL.revokeObjectURL(question.imagePreview)
  question.imagePreview = URL.createObjectURL(file)
  question.imageUrl = null
  question.imageUploading = true
  createError.value = ''
  try {
    const body = new FormData()
    body.append('file', file)
    const uploaded = await apiRequest('/quizzes/images', {
      method: 'POST',
      token: auth.token,
      body,
    })
    if (question.imageFile === file) question.imageUrl = uploaded.imageUrl
  } catch (error) {
    createError.value = error.message || 'Could not upload this quiz image.'
    handleUnauthorized(error)
  } finally {
    question.imageUploading = false
  }
}

function clearQuizFormImages() {
  quizForm.questions.forEach((question) => {
    if (question.imagePreview) URL.revokeObjectURL(question.imagePreview)
  })
}

function removeQuestion(index) {
  const [question] = quizForm.questions.splice(index, 1)
  if (question.imagePreview) URL.revokeObjectURL(question.imagePreview)
}

function clearQuestionImages() {
  Object.values(imageSources).forEach((url) => URL.revokeObjectURL(url))
  Object.keys(imageSources).forEach((key) => delete imageSources[key])
  Object.keys(imageErrors).forEach((key) => delete imageErrors[key])
}

async function loadQuestionImages(questions) {
  clearQuestionImages()
  await Promise.all(
    questions
      .filter((question) => question.imageUrl)
      .map(async (question) => {
        try {
          const blob = await downloadFile(question.imageUrl, { token: auth.token })
          imageSources[question.id] = URL.createObjectURL(blob)
        } catch (error) {
          imageErrors[question.id] = error.message || 'Could not load this question image.'
          handleUnauthorized(error)
        }
      }),
  )
}

function onQuestionTypeChange(question) {
  if (question.questionType === 'MULTIPLE_CHOICE' && question.options.length < 2) {
    question.options = ['', '', '', '']
    question.correctOptionIndex = 0
  }
}

function removeOption(question, index) {
  question.options.splice(index, 1)
  if (question.correctOptionIndex === index) {
    question.correctOptionIndex = 0
  } else if (question.correctOptionIndex > index) {
    question.correctOptionIndex -= 1
  }
}

async function createQuiz() {
  createError.value = ''
  if (
    !quizForm.questions.length ||
    quizForm.questions.some((question) => question.imageUploading || (question.imageFile && !question.imageUrl)) ||
    quizForm.questions.some((question) => {
      if (!question.prompt.trim()) return true
      if (question.questionType !== 'MULTIPLE_CHOICE') return false
      const options = question.options.map((option) => option.trim().toLowerCase())
      return (
        options.length < 2 ||
        options.some((option) => !option) ||
        new Set(options).size !== options.length ||
        question.correctOptionIndex < 0 ||
        question.correctOptionIndex >= options.length
      )
    })
  ) {
    createError.value = 'Complete every question and provide unique options with one correct answer.'
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
          questionType: question.questionType,
          imageUrl: question.imageUrl || null,
          ...(question.questionType === 'MULTIPLE_CHOICE'
            ? {
                options: question.options.map((option) => option.trim()),
                correctOptionIndex: question.correctOptionIndex,
              }
            : {}),
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
  reviewMode.value = false
  quizExpired.value = false
  try {
    selectedQuiz.value = await apiRequest(`/quizzes/${quiz.id}`, { token: auth.token })
    if (!selectedQuiz.value.questions?.length) {
      throw new Error('Quiz questions are not available yet. Check the quiz opening time.')
    }
    await loadQuestionImages(selectedQuiz.value.questions)
    Object.keys(answers).forEach((key) => delete answers[key])
    selectedQuiz.value.questions.forEach((question) => {
      answers[question.id] = question.questionType === 'MULTIPLE_CHOICE' ? null : ''
    })
    takeDialogOpen.value = true
    updateRemainingTime()
    countdownInterval = setInterval(updateRemainingTime, 250)
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: error.message || 'Could not open this quiz.',
      position: 'top-right',
    })
    handleUnauthorized(error)
  }
}

async function openReview(quiz) {
  takeError.value = ''
  reviewMode.value = true
  stopCountdown()
  try {
    selectedQuiz.value = await apiRequest(`/quizzes/${quiz.id}`, { token: auth.token })
    await loadQuestionImages(selectedQuiz.value.questions || [])
    Object.keys(answers).forEach((key) => delete answers[key])
    selectedQuiz.value.questions.forEach((question) => {
      const answer = selectedQuiz.value.myAnswers?.find((row) => row.questionId === question.id)
      answers[question.id] =
        question.questionType === 'MULTIPLE_CHOICE'
          ? (answer?.selectedOptionId ?? null)
          : answer?.responseText || ''
    })
    takeDialogOpen.value = true
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: error.message || 'Could not load quiz answers.',
      position: 'top-right',
    })
    handleUnauthorized(error)
  }
}

async function submitQuiz(timedOut = false) {
  if (!selectedQuiz.value) return
  if (submitting.value) {
    if (timedOut) timeoutSubmissionPending = true
    return
  }
  takeError.value = ''
  const unanswered = !timedOut && selectedQuiz.value.questions.some((question) => {
    const answer = answers[question.id]
    return question.questionType === 'MULTIPLE_CHOICE'
      ? answer === null || answer === undefined
      : !answer?.trim()
  })
  if (unanswered) {
    takeError.value = 'Answer every question before submitting.'
    return
  }
  submitting.value = true
  try {
    await apiRequest(`/quizzes/${selectedQuiz.value.id}/attempts`, {
      method: 'POST',
      token: auth.token,
      body: {
        timedOut,
        answers: selectedQuiz.value.questions.map((question) => ({
          questionId: question.id,
          ...(question.questionType === 'MULTIPLE_CHOICE'
            ? { selectedOptionId: answers[question.id] }
            : { responseText: answers[question.id] }),
        })),
      },
    })
    stopCountdown()
    takeDialogOpen.value = false
    $q.notify({
      type: 'positive',
      message: timedOut ? 'Time elapsed — your quiz was submitted.' : 'Quiz submitted',
      position: 'top-right',
    })
    await loadPage()
  } catch (error) {
    takeError.value = error.message || 'Could not submit the quiz.'
    handleUnauthorized(error)
  } finally {
    submitting.value = false
    if (timeoutSubmissionPending && takeDialogOpen.value) {
      timeoutSubmissionPending = false
      await submitQuiz(true)
    }
  }
}

function updateRemainingTime() {
  if (!selectedQuiz.value || reviewMode.value) return
  const deadline = new Date(selectedQuiz.value.closesAt).getTime()
  remainingSeconds.value = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
  if (remainingSeconds.value === 0 && !quizExpired.value) {
    quizExpired.value = true
    stopCountdown()
    submitQuiz(true)
  }
}

function stopCountdown() {
  if (countdownInterval) {
    clearInterval(countdownInterval)
    countdownInterval = null
  }
}

function formatRemainingTime(seconds) {
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
}

function optionLabel(question, option) {
  const isCorrect = reviewMode.value && question.correctOptionId === option.id
  const isSelected = reviewMode.value && answers[question.id] === option.id
  if (isCorrect && isSelected) return `${option.text} — Your answer (correct)`
  if (isCorrect) return `${option.text} — Correct answer`
  if (isSelected) return `${option.text} — Your answer`
  return option.text
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
    grade < attempt.autoGradedPoints ||
    grade > selectedQuiz.value.totalPoints
  ) {
    attemptErrors[attempt.id] =
      `Enter a grade from ${attempt.autoGradedPoints} to ${selectedQuiz.value.totalPoints}.`
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

function learnerSubmissionLabel(quiz) {
  if (!quiz.hasMultipleChoiceQuestions) return 'Submitted — awaiting grade'
  if (!quiz.hasWrittenQuestions) return `Auto-graded: ${quiz.myGrade} / ${quiz.totalPoints}`
  return `Auto-scored ${quiz.myAutoGradedPoints} points · written answers awaiting grade`
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

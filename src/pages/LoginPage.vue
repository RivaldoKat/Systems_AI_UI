<template>
  <main class="login-page">
    <div class="login-art">
      <div class="login-brand">
        <div class="brand-mark brand-mark-light">L</div>
        <span>Luma</span>
      </div>
      <div class="art-copy">
        <div class="eyebrow">YOUR CAMPUS, CONNECTED</div>
        <h1>Make room<br />for what’s next.</h1>
        <p>One calm place to manage learning, people, and progress.</p>
        <div class="art-orbit orbit-one"></div>
        <div class="art-orbit orbit-two"></div>
        <div class="art-spark spark-one">✦</div>
        <div class="art-spark spark-two">✳</div>
      </div>
      <div class="art-footer">A brighter way to learn together.</div>
    </div>

    <div class="login-form-side">
      <div class="login-form-wrap">
        <div class="mobile-brand">
          <div class="brand-mark">L</div>
          <strong>Luma</strong>
        </div>
        <div class="form-kicker">WELCOME BACK</div>
        <h2>Sign in to your account</h2>
        <p class="form-intro">Enter your school account details to continue.</p>

        <q-form class="login-form" @submit.prevent="submit">
          <label class="field-label" for="email">Email address</label>
          <q-input
            id="email"
            v-model.trim="email"
            outlined
            type="email"
            placeholder="you@school.edu"
            autocomplete="username"
            :rules="[(value) => !!value || 'Enter your email address']"
          >
            <template #prepend><q-icon name="mail_outline" color="blue-grey-5" /></template>
          </q-input>

          <div class="password-label-row">
            <label class="field-label" for="password">Password</label>
          </div>
          <q-input
            id="password"
            v-model="password"
            outlined
            :type="showPassword ? 'text' : 'password'"
            placeholder="Enter your password"
            autocomplete="current-password"
            :rules="[(value) => !!value || 'Enter your password']"
          >
            <template #prepend><q-icon name="lock_outline" color="blue-grey-5" /></template>
            <template #append>
              <q-icon
                :name="showPassword ? 'visibility_off' : 'visibility'"
                class="cursor-pointer"
                color="blue-grey-5"
                @click="showPassword = !showPassword"
              />
            </template>
          </q-input>

          <q-banner v-if="error" rounded class="error-banner q-mb-md">{{ error }}</q-banner>
          <q-btn
            class="full-width sign-in-button"
            color="primary"
            unelevated
            no-caps
            type="submit"
            :loading="loading"
            label="Sign in"
            icon-right="arrow_forward"
          />
        </q-form>
        <div class="secure-note">
          <q-icon name="verified_user" /> Secure access for your school community
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from '@/stores/auth-store'

const auth = useAuthStore()
const router = useRouter()
const $q = useQuasar()
const email = ref('')
const password = ref('')
const showPassword = ref(false)
const loading = ref(false)
const error = ref('')

async function submit() {
  error.value = ''
  loading.value = true
  try {
    await auth.login(email.value, password.value)
    $q.notify({ type: 'positive', message: 'Welcome back', position: 'top-right' })
    router.push('/app/overview')
  } catch (requestError) {
    error.value = requestError.message || 'Sign in failed. Check your credentials and try again.'
  } finally {
    loading.value = false
  }
}
</script>

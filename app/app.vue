<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useSycoUiState } from './composables/useSycoUiState'
import { useAppRouter, type AppRoute } from './composables/useAppRouter'
import { useSycoLayout } from './composables/useSycoLayout'
import LiveControl from './components/LiveControl.vue'
import SycoVideoPlayer from './components/SycoVideoPlayer.vue'
import DestinationMatrix from './components/DestinationMatrix.vue'
import TemplateGallery from './components/TemplateGallery.vue'
import SceneEditor from './components/SceneEditor.vue'
import OperationsPage from './components/OperationsPage.vue'
import OutputProfileEditor from './components/OutputProfileEditor.vue'
import { runtimeApi, type CurrentUser } from './services/runtime-api'
import './app.css'

const ui = useSycoUiState()
const router = useAppRouter()
useSycoLayout()

const identity = ref<CurrentUser | null>(null)
const authReady = ref(false)
const username = ref('')
const password = ref('')
const authError = ref('')

const items: Array<{ id: AppRoute; label: string }> = [
  { id: 'live', label: 'Live' },
  { id: 'destinations', label: 'Destinations' },
  { id: 'profiles', label: 'Profiles' },
  { id: 'templates', label: 'Templates' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'archive', label: 'Archive' },
  { id: 'status', label: 'Status' },
  { id: 'logs', label: 'Logs' },
  { id: 'overlay', label: 'Overlay' },
  { id: 'about', label: 'About' },
]

async function loadIdentity(): Promise<void> {
  try {
    identity.value = await runtimeApi.me()
  } catch {
    identity.value = null
  } finally {
    authReady.value = true
  }
}

async function login(): Promise<void> {
  authError.value = ''
  try {
    identity.value = await runtimeApi.login(username.value, password.value)
    password.value = ''
  } catch (error) {
    authError.value = error instanceof Error ? error.message : 'Login failed'
  }
}

async function logout(): Promise<void> {
  await runtimeApi.logout()
  identity.value = null
}

onMounted(() => void loadIdentity())
</script>

<template>
  <div v-if="!authReady" class="auth-screen" aria-live="polite">
    <p>INITIALIZING CONTROL PLANE</p>
  </div>

  <div v-else-if="!identity" class="auth-screen">
    <form class="auth-panel" aria-labelledby="access-title" @submit.prevent="login">
      <p class="syco-brand">SYCO23</p>
      <h1 id="access-title">CONTROL ACCESS</h1>
      <label>
        USERNAME
        <input v-model="username" autocomplete="username" required>
      </label>
      <label>
        PASSWORD
        <input v-model="password" type="password" autocomplete="current-password" required>
      </label>
      <p v-if="authError" class="auth-error" role="alert">{{ authError }}</p>
      <button type="submit">AUTHENTICATE</button>
    </form>
  </div>

  <div v-else class="syco-app">
    <header class="syco-header">
      <button class="brand-button" type="button" aria-label="Open live control" @click="router.navigate('live')">
        <span class="syco-brand">SYCO23</span>
        <span class="syco-sub">MULTICAST CONTROL</span>
      </button>
      <button class="identity-button" type="button" aria-label="Sign out" @click="logout">
        {{ identity.actor }} / {{ identity.role }}
      </button>
      <span class="syco-status" :class="{ live: ui.state.live }" aria-live="polite">
        {{ ui.state.live ? 'LIVE' : 'OFFLINE' }}
      </span>
    </header>

    <div class="app-shell">
      <nav class="side-nav" aria-label="Primary">
        <button
          v-for="item in items"
          :key="item.id"
          type="button"
          :data-nav="item.id"
          :aria-current="router.route.value === item.id ? 'page' : undefined"
          :class="{ active: router.route.value === item.id }"
          @click="router.navigate(item.id)"
        >
          {{ item.label }}
        </button>
      </nav>

      <main class="syco-main" tabindex="-1">
        <template v-if="router.route.value === 'live'">
          <LiveControl />
          <SycoVideoPlayer />
          <DestinationMatrix />
        </template>
        <OutputProfileEditor v-else-if="router.route.value === 'profiles'" />
        <TemplateGallery v-else-if="router.route.value === 'templates'" />
        <SceneEditor v-else-if="router.route.value === 'overlay'" />
        <OperationsPage v-else :route="router.route.value" />
      </main>
    </div>

    <nav class="syco-nav" aria-label="Mobile">
      <button
        v-for="item in items"
        :key="item.id"
        type="button"
        class="syco-nav-item"
        :data-nav="item.id"
        :aria-current="router.route.value === item.id ? 'page' : undefined"
        :class="{ active: router.route.value === item.id }"
        @click="router.navigate(item.id)"
      >
        {{ item.label }}
      </button>
    </nav>
  </div>
</template>

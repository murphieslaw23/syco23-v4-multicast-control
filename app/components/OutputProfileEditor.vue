<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import type { OutputProfile, Provider } from '../contracts/domain'
import { runtimeApi, type CurrentUser, type ProviderDefinition } from '../services/runtime-api'
import { useOutputProfiles } from '../composables/useOutputProfiles'

const identity = ref<CurrentUser | null>(null)
const providers = ref<ProviderDefinition[]>([])
const notice = ref('')
const conflict = ref(false)
const profileState = useOutputProfiles()

function blankProfile(provider: Provider = 'youtube'): OutputProfile {
  return {
    id: '',
    name: '',
    provider,
    width: 1920,
    height: 1080,
    videoBitrate: 4500,
    audioBitrate: 128,
    fps: 30,
    codec: 'libx264',
  }
}

const draft = ref<OutputProfile>(blankProfile())
const isAdmin = computed(() => identity.value?.role === 'admin')
const policy = computed(() => providers.value.find((item) => item.id === draft.value.provider)?.profilePolicy ?? null)
const currentProvider = computed(() => providers.value.find((item) => item.id === draft.value.provider) ?? null)
const editing = computed(() => Boolean(draft.value.id))

function applyProviderDefaults(): void {
  const value = policy.value
  if (!value) return
  draft.value.width = value.widths.includes(draft.value.width) ? draft.value.width : (value.widths.at(-1) ?? 1920)
  draft.value.height = value.heights.includes(draft.value.height) ? draft.value.height : (value.heights.at(-1) ?? 1080)
  draft.value.fps = value.fps.includes(draft.value.fps) ? draft.value.fps : (value.fps.includes(30) ? 30 : value.fps[0])
  draft.value.videoBitrate = Math.min(value.videoBitrateKbps.max, Math.max(value.videoBitrateKbps.min, draft.value.videoBitrate))
  draft.value.audioBitrate = Math.min(value.audioBitrateKbps.max, Math.max(value.audioBitrateKbps.min, draft.value.audioBitrate))
  draft.value.codec = value.codecs.includes(draft.value.codec) ? draft.value.codec : value.codecs[0]
}

watch(() => draft.value.provider, applyProviderDefaults)

function reset(clearNotice = true): void {
  const provider = draft.value.provider
  draft.value = blankProfile(provider)
  applyProviderDefaults()
  if (clearNotice) notice.value = ''
  conflict.value = false
}

function edit(profile: OutputProfile): void {
  draft.value = structuredClone(profile)
  notice.value = ''
  conflict.value = false
}

async function refresh(): Promise<void> {
  notice.value = ''
  await Promise.all([
    profileState.loadProfiles(),
    runtimeApi.providers().then((items) => { providers.value = items }),
    runtimeApi.me().then((user) => { identity.value = user }),
  ])
  applyProviderDefaults()
}

async function save(): Promise<void> {
  notice.value = ''
  conflict.value = false
  const value: OutputProfile = {
    ...draft.value,
    id: draft.value.id || crypto.randomUUID(),
    name: draft.value.name.trim(),
    width: Number(draft.value.width),
    height: Number(draft.value.height),
    videoBitrate: Number(draft.value.videoBitrate),
    audioBitrate: Number(draft.value.audioBitrate),
    fps: Number(draft.value.fps),
  }
  if (!value.name) {
    notice.value = 'Profile name is required.'
    return
  }
  try {
    if (editing.value) {
      await profileState.updateProfile(value.id, value, draft.value.version)
      notice.value = `Updated ${value.name}.`
    } else {
      await profileState.createProfile(value)
      notice.value = `Created ${value.name}.`
    }
    reset(false)
  } catch (cause) {
    const error = cause as Error & { code?: string }
    conflict.value = error.code === 'REVISION_CONFLICT'
    notice.value = conflict.value
      ? 'This profile changed on the server. The current revision has been reloaded.'
      : error.message
    if (conflict.value) {
      await profileState.loadProfiles()
      const current = profileState.getProfile(value.id)
      if (current) draft.value = structuredClone(current)
    }
  }
}

async function remove(profile: OutputProfile): Promise<void> {
  if (!confirm(`Delete ${profile.name}?`)) return
  notice.value = ''
  try {
    await profileState.deleteProfile(profile.id)
    if (draft.value.id === profile.id) reset()
  } catch (cause) {
    notice.value = cause instanceof Error ? cause.message : String(cause)
  }
}

onMounted(() => void refresh())
</script>

<template>
  <section class="profile-page">
    <header class="profile-header">
      <div>
        <p class="eyebrow">TRANSMISSION / OUTPUT PROFILES</p>
        <h1>Provider encoder profiles</h1>
        <p class="muted">Profiles are validated against the selected provider before persistence and again before FFmpeg starts.</p>
      </div>
      <button class="control-button" type="button" @click="refresh">Refresh</button>
    </header>

    <p v-if="notice" class="alert" :class="conflict ? 'alert--error' : ''">{{ notice }}</p>
    <p v-if="profileState.error.value" class="alert alert--error">{{ profileState.error.value }}</p>

    <div class="profile-layout">
      <form v-if="isAdmin" class="ops-panel profile-form" @submit.prevent="save">
        <div class="panel-heading">
          <h2>{{ editing ? 'Edit profile' : 'Create profile' }}</h2>
          <span v-if="editing" class="status-pill">REV {{ draft.version ?? 1 }}</span>
        </div>
        <label>Name<input v-model="draft.name" required placeholder="YouTube 1080p30"></label>
        <label>Provider
          <select v-model="draft.provider">
            <option v-for="provider in providers" :key="provider.id" :value="provider.id">{{ provider.label }}</option>
          </select>
        </label>
        <div class="profile-form__pair">
          <label>Width<select v-model.number="draft.width"><option v-for="width in policy?.widths ?? []" :key="width" :value="width">{{ width }}</option></select></label>
          <label>Height<select v-model.number="draft.height"><option v-for="height in policy?.heights ?? []" :key="height" :value="height">{{ height }}</option></select></label>
        </div>
        <div class="profile-form__pair">
          <label>Frame rate<select v-model.number="draft.fps"><option v-for="fps in policy?.fps ?? []" :key="fps" :value="fps">{{ fps }} FPS</option></select></label>
          <label>Codec<select v-model="draft.codec"><option v-for="codec in policy?.codecs ?? []" :key="codec" :value="codec">{{ codec }}</option></select></label>
        </div>
        <label>Video bitrate — kbps
          <input v-model.number="draft.videoBitrate" type="number" :min="policy?.videoBitrateKbps.min" :max="policy?.videoBitrateKbps.max" required>
          <small v-if="policy">Allowed {{ policy.videoBitrateKbps.min }}–{{ policy.videoBitrateKbps.max }} kbps</small>
        </label>
        <label>Audio bitrate — kbps
          <input v-model.number="draft.audioBitrate" type="number" :min="policy?.audioBitrateKbps.min" :max="policy?.audioBitrateKbps.max" required>
          <small v-if="policy">Allowed {{ policy.audioBitrateKbps.min }}–{{ policy.audioBitrateKbps.max }} kbps</small>
        </label>
        <div class="inline-actions">
          <button class="control-button control-button--primary" type="submit">{{ editing ? 'Save revision' : 'Create profile' }}</button>
          <button v-if="editing" class="control-button" type="button" @click="reset()">Cancel</button>
        </div>
      </form>

      <div class="ops-panel profile-policy">
        <h2>Active provider policy</h2>
        <template v-if="currentProvider && policy">
          <strong>{{ currentProvider.label }}</strong>
          <dl>
            <dt>Resolution widths</dt><dd>{{ policy.widths.join(', ') }}</dd>
            <dt>Resolution heights</dt><dd>{{ policy.heights.join(', ') }}</dd>
            <dt>Frame rates</dt><dd>{{ policy.fps.join(', ') }}</dd>
            <dt>Keyframe interval</dt><dd>{{ policy.keyframeIntervalSeconds }} seconds</dd>
            <dt>Metadata API</dt><dd>{{ currentProvider.capabilities.metadata ? 'supported' : 'not supported' }}</dd>
          </dl>
        </template>
      </div>
    </div>

    <div class="ops-panel table-wrap" tabindex="0" aria-label="Output profiles table">
      <div class="panel-heading"><h2>Persisted profiles</h2><span>{{ profileState.profiles.value.length }} configured</span></div>
      <table>
        <thead><tr><th>Name</th><th>Provider</th><th>Video</th><th>Bitrates</th><th>Codec</th><th>Revision</th><th></th></tr></thead>
        <tbody>
          <tr v-for="profile in profileState.profiles.value" :key="profile.id">
            <td><strong>{{ profile.name }}</strong><small class="mono">{{ profile.id }}</small></td>
            <td>{{ profile.provider }}</td>
            <td>{{ profile.width }} × {{ profile.height }} / {{ profile.fps }}p</td>
            <td>{{ profile.videoBitrate }}k video · {{ profile.audioBitrate }}k audio</td>
            <td class="mono">{{ profile.codec }}</td>
            <td>{{ profile.version ?? 1 }}</td>
            <td><div v-if="isAdmin" class="inline-actions"><button @click="edit(profile)">Edit</button><button class="danger" @click="remove(profile)">Delete</button></div></td>
          </tr>
        </tbody>
      </table>
      <p v-if="!profileState.profiles.value.length && !profileState.loading.value" class="empty">No output profiles configured.</p>
    </div>
  </section>
</template>

<style scoped>
.profile-page { display: grid; gap: 1rem; }
.profile-header, .panel-heading { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; }
.profile-header h1 { margin: .15rem 0; text-transform: uppercase; }
.profile-layout { display: grid; grid-template-columns: minmax(18rem, 1.15fr) minmax(16rem, .85fr); gap: 1rem; }
.profile-form { display: grid; gap: .8rem; }
.profile-form label { display: grid; gap: .35rem; text-transform: uppercase; font-size: .75rem; letter-spacing: .08em; }
.profile-form input, .profile-form select { width: 100%; }
.profile-form__pair { display: grid; grid-template-columns: 1fr 1fr; gap: .75rem; }
.profile-policy dl { display: grid; grid-template-columns: minmax(8rem, .8fr) 1.2fr; gap: .65rem 1rem; }
.profile-policy dt { color: var(--syco-muted, #8c8c8c); }
td small { display: block; margin-top: .25rem; color: var(--syco-muted, #8c8c8c); }
@media (max-width: 800px) { .profile-layout { grid-template-columns: 1fr; } .profile-form__pair { grid-template-columns: 1fr; } .profile-header { align-items: stretch; flex-direction: column; } }
</style>

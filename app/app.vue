<script setup lang="ts">
import { useSycoLayout } from './composables/useSycoLayout'
import { useSycoUiState } from './composables/useSycoUiState'
import LiveControl from './components/LiveControl.vue'
import SycoVideoPlayer from './components/SycoVideoPlayer.vue'
import DestinationMatrix from './components/DestinationMatrix.vue'
import TemplateGallery from './components/TemplateGallery.vue'
import LogViewer from './components/LogViewer.vue'
import './app.css'

const layout = useSycoLayout()
const ui = useSycoUiState()
</script>

<template>
  <div class="syco-app">
    <header class="syco-header">
      <span class="syco-brand">SYCO23</span>
      <span class="syco-sub">BROADCAST CONTROL</span>
      <span class="syco-status" :class="{ live: ui.state.live }">
        {{ ui.state.live ? 'LIVE' : 'OFFLINE' }}
      </span>
    </header>
    <main class="syco-main">
      <LiveControl />
      <SycoVideoPlayer />
      <DestinationMatrix />
      <TemplateGallery />
      <LogViewer />
    </main>
    <nav class="syco-nav">
      <button class="syco-nav-item active" data-nav="live">Live</button>
      <button class="syco-nav-item" data-nav="destinations">Destinations</button>
      <button class="syco-nav-item" data-nav="logs">Logs</button>
    </nav>
  </div>
</template>

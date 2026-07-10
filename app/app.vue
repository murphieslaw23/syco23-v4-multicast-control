<script setup lang="ts">
import { useSycoUiState } from './composables/useSycoUiState'
import { useAppRouter, type AppRoute } from './composables/useAppRouter'
import LiveControl from './components/LiveControl.vue'
import SycoVideoPlayer from './components/SycoVideoPlayer.vue'
import DestinationMatrix from './components/DestinationMatrix.vue'
import TemplateGallery from './components/TemplateGallery.vue'
import LogViewer from './components/LogViewer.vue'
import SceneEditor from './components/SceneEditor.vue'
import OperationsPage from './components/OperationsPage.vue'
import './app.css'
const ui=useSycoUiState(); const router=useAppRouter()
const items:{id:AppRoute;label:string}[]=[{id:'live',label:'Live'},{id:'destinations',label:'Destinations'},{id:'templates',label:'Templates'},{id:'schedule',label:'Schedule'},{id:'archive',label:'Archive'},{id:'status',label:'Status'},{id:'logs',label:'Logs'},{id:'overlay',label:'Overlay'},{id:'about',label:'About'}]
</script>
<template><div class="syco-app"><header class="syco-header"><button class="brand-button" @click="router.navigate('live')"><span class="syco-brand">SYCO23</span><span class="syco-sub">MULTICAST CONTROL</span></button><span class="syco-status" :class="{live:ui.state.live}">{{ ui.state.live?'LIVE':'OFFLINE' }}</span></header><div class="app-shell"><nav class="side-nav" aria-label="Primary"><button v-for="item in items" :key="item.id" :class="{active:router.route.value===item.id}" @click="router.navigate(item.id)">{{ item.label }}</button></nav><main class="syco-main"><template v-if="router.route.value==='live'"><LiveControl/><SycoVideoPlayer/><DestinationMatrix/></template><TemplateGallery v-else-if="router.route.value==='templates'"/><SceneEditor v-else-if="router.route.value==='overlay'"/><OperationsPage v-else :route="router.route.value"/></main></div><nav class="syco-nav" aria-label="Mobile"><button v-for="item in items.slice(0,5)" :key="item.id" class="syco-nav-item" :class="{active:router.route.value===item.id}" @click="router.navigate(item.id)">{{ item.label }}</button></nav></div></template>

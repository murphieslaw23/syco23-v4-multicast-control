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
import { onMounted, ref } from 'vue'
import { runtimeApi, type CurrentUser } from './services/runtime-api'
import './app.css'
const ui=useSycoUiState(); const router=useAppRouter(); const identity=ref<CurrentUser|null>(null); const authReady=ref(false); const username=ref(''); const password=ref(''); const authError=ref('');
async function loadIdentity(){try{identity.value=await runtimeApi.me()}catch{identity.value=null}finally{authReady.value=true}}
async function login(){authError.value='';try{identity.value=await runtimeApi.login(username.value,password.value);password.value=''}catch(error){authError.value=error instanceof Error?error.message:'Login failed'}}
async function logout(){await runtimeApi.logout();identity.value=null}
onMounted(()=>void loadIdentity())
const items:{id:AppRoute;label:string}[]=[{id:'live',label:'Live'},{id:'destinations',label:'Destinations'},{id:'templates',label:'Templates'},{id:'schedule',label:'Schedule'},{id:'archive',label:'Archive'},{id:'status',label:'Status'},{id:'logs',label:'Logs'},{id:'overlay',label:'Overlay'},{id:'about',label:'About'}]
</script>
<template><div v-if="!authReady" class="auth-screen"><p>INITIALIZING CONTROL PLANE</p></div><div v-else-if="!identity" class="auth-screen"><form class="auth-panel" @submit.prevent="login"><p class="syco-brand">SYCO23</p><h1>CONTROL ACCESS</h1><label>USERNAME<input v-model="username" autocomplete="username" required></label><label>PASSWORD<input v-model="password" type="password" autocomplete="current-password" required></label><p v-if="authError" class="auth-error">{{ authError }}</p><button type="submit">AUTHENTICATE</button></form></div><div v-else class="syco-app"><header class="syco-header"><button class="brand-button" @click="router.navigate('live')"><span class="syco-brand">SYCO23</span><span class="syco-sub">MULTICAST CONTROL</span></button><button class="identity-button" @click="logout">{{ identity.actor }} / {{ identity.role }}</button><span class="syco-status" :class="{live:ui.state.live}">{{ ui.state.live?'LIVE':'OFFLINE' }}</span></header><div class="app-shell"><nav class="side-nav" aria-label="Primary"><button v-for="item in items" :key="item.id" :class="{active:router.route.value===item.id}" @click="router.navigate(item.id)">{{ item.label }}</button></nav><main class="syco-main"><template v-if="router.route.value==='live'"><LiveControl/><SycoVideoPlayer/><DestinationMatrix/></template><TemplateGallery v-else-if="router.route.value==='templates'"/><SceneEditor v-else-if="router.route.value==='overlay'"/><OperationsPage v-else :route="router.route.value"/></main></div><nav class="syco-nav" aria-label="Mobile"><button v-for="item in items.slice(0,5)" :key="item.id" class="syco-nav-item" :class="{active:router.route.value===item.id}" @click="router.navigate(item.id)">{{ item.label }}</button></nav></div></template>

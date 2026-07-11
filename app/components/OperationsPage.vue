<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { runtimeApi, type AuditEntry, type BackupRecord, type CurrentUser, type Incident, type ProviderProbeSnapshot, type RuntimeLog, type RuntimeSession, type ScheduleJob, type SystemMetrics, type WorkerSnapshot } from '../services/runtime-api'
import type { AppRoute } from '../composables/useAppRouter'
import type { DestinationState, OutputProfile } from '../types'
import RevisionHistoryPanel from './RevisionHistoryPanel.vue'

const props = defineProps<{ route: AppRoute }>()
const user = ref<CurrentUser|null>(null)
const loading = ref(false)
const error = ref('')
const logs = ref<RuntimeLog[]>([])
const sessions = ref<RuntimeSession[]>([])
const schedules = ref<ScheduleJob[]>([])
const incidents = ref<Incident[]>([])
const audit = ref<AuditEntry[]>([])
const backups = ref<BackupRecord[]>([])
const workers = ref<WorkerSnapshot[]>([])
const destinations = ref<DestinationState[]>([])
const profiles = ref<OutputProfile[]>([])
const providerProbes = ref<ProviderProbeSnapshot[]>([])
const systemMetrics = ref<SystemMetrics|null>(null)
const retentionResult = ref<Record<string,number>|null>(null)
const search = ref('')
const level = ref('all')
const resolution = ref<Record<string,string>>({})
const newSchedule = ref({ name:'', action:'pipeline.stop' as ScheduleJob['action'], runAt:new Date(Date.now()+3600000).toISOString().slice(0,16), recurrenceMinutes:'' })
const destinationDraft = ref<DestinationState>({id:'',provider:'custom-rtmp',label:'',protocol:'rtmps',endpointUrl:'',streamKeyRef:'',status:'configured',health:null,lastHandshakeAt:null,lastError:null,videoProfile:'default',audioProfile:'default',monitorMode:'rtmp-output',hlsPlaybackUrl:'',providerAckUrl:'',providerMetadataUrl:'',providerApiSecretRef:'',requiresManualPlatformSetup:false,capabilities:[],transmissionKitId:null,notes:''})

const isOperator = computed(()=>user.value?.role==='operator'||user.value?.role==='admin')
const isAdmin = computed(()=>user.value?.role==='admin')
const compatibleProfiles = computed(()=>profiles.value.filter(item=>item.provider===destinationDraft.value.provider||item.provider==='custom-rtmp'))
const filteredLogs = computed(()=>logs.value.filter(item=>(level.value==='all'||item.level===level.value)&&`${item.source} ${item.message}`.toLowerCase().includes(search.value.toLowerCase())))

async function refresh(){
 loading.value=true; error.value=''
 try {
  user.value=await runtimeApi.me()
  if(props.route==='logs') logs.value=await runtimeApi.logs()
  if(props.route==='archive') sessions.value=await runtimeApi.sessions()
  if(props.route==='schedule') schedules.value=await runtimeApi.schedules()
  if(props.route==='status'){ const [i,w,d,p,m]=await Promise.all([runtimeApi.incidents(),runtimeApi.workers(),runtimeApi.destinations(),runtimeApi.providerMonitor(),runtimeApi.systemMetrics()]); incidents.value=i;workers.value=w;destinations.value=d;providerProbes.value=p;systemMetrics.value=m }
  if(props.route==='about'&&isAdmin.value){ [audit.value,backups.value]=await Promise.all([runtimeApi.audit(),runtimeApi.backups()]) }
  if(props.route==='destinations'){ const [d,p]=await Promise.all([runtimeApi.destinations(),runtimeApi.profiles()]); destinations.value=d; profiles.value=p; if(!compatibleProfiles.value.some(item=>item.id===destinationDraft.value.videoProfile)){ destinationDraft.value.videoProfile=compatibleProfiles.value[0]?.id||''; destinationDraft.value.audioProfile=destinationDraft.value.videoProfile } }
 } catch(e){ error.value=e instanceof Error?e.message:String(e) } finally { loading.value=false }
}
async function createSchedule(){
 const recurrence=Number(newSchedule.value.recurrenceMinutes)
 await runtimeApi.createSchedule({name:newSchedule.value.name,action:newSchedule.value.action,runAt:new Date(newSchedule.value.runAt).toISOString(),recurrenceMinutes:recurrence>0?recurrence:null,payload:{},enabled:true,nextRunAt:new Date(newSchedule.value.runAt).toISOString()}); newSchedule.value.name=''; await refresh()
}
async function removeSchedule(item:ScheduleJob){ if(confirm('Delete this schedule?')){ await runtimeApi.deleteSchedule(item.id,item.version); await refresh() } }
async function resolveIncident(item:Incident){ const text=resolution.value[item.id]?.trim(); if(!text)return; await runtimeApi.resolveIncident(item.id,text); await refresh() }
async function backup(){ await runtimeApi.createBackup(); await refresh() }
async function probe(destinationId?:string){ providerProbes.value=await runtimeApi.probeProviders(destinationId) }
async function runRetention(){ retentionResult.value=await runtimeApi.runRetention() }
async function restore(id:string){ if(confirm(`Restore ${id}? Current database state will be replaced.`)){ await runtimeApi.restoreBackup(id); await refresh() } }
async function saveDestination(){
 const value={...destinationDraft.value,id:destinationDraft.value.id||crypto.randomUUID(),label:destinationDraft.value.label.trim()}
 if(!value.label||!value.endpointUrl||!value.streamKeyRef){error.value='Label, endpoint, and secret reference are required';return}
 if(!value.videoProfile){error.value='An output profile is required';return}
 value.audioProfile=value.videoProfile
 const existing=destinations.value.some(item=>item.id===value.id)
 if(existing) await runtimeApi.updateDestination(value.id,value,value.version); else await runtimeApi.createDestination(value)
 destinationDraft.value={...destinationDraft.value,id:'',label:'',endpointUrl:'',streamKeyRef:'',notes:''}; await refresh()
}
function editDestination(item:DestinationState){ destinationDraft.value=JSON.parse(JSON.stringify(item)) }
function profileLabel(id:string){ const profile=profiles.value.find(item=>item.id===id); return profile?`${profile.name} · ${profile.width}×${profile.height}/${profile.fps}`:id }
async function deleteDestination(item:DestinationState){if(confirm('Delete this destination?')){await runtimeApi.deleteDestination(item.id,item.version);await refresh()}}
watch(()=>destinationDraft.value.provider,()=>{ if(!compatibleProfiles.value.some(item=>item.id===destinationDraft.value.videoProfile)){ destinationDraft.value.videoProfile=compatibleProfiles.value[0]?.id||''; destinationDraft.value.audioProfile=destinationDraft.value.videoProfile } })
watch(()=>props.route,()=>void refresh())
onMounted(()=>void refresh())
</script>

<template>
  <section class="ops-page">
    <header class="ops-page__header"><div><p class="eyebrow">OPERATIONS / {{ route.toUpperCase() }}</p><h1>{{ route }}</h1></div><button class="control-button" @click="refresh">Refresh</button></header>
    <p v-if="error" class="alert alert--error">{{ error }}</p><p v-if="loading" class="muted">Loading operational state…</p>

    <template v-if="route==='destinations'">
      <div class="ops-grid ops-grid--split">
        <form v-if="isAdmin" class="ops-panel form-grid" @submit.prevent="saveDestination">
          <h2>{{ destinationDraft.id?'Edit':'Add' }} destination</h2>
          <label>Label<input v-model="destinationDraft.label" required></label>
          <label>Provider<select v-model="destinationDraft.provider"><option v-for="p in ['youtube','telegram','tiktok','twitch','instagram','mixer','mixcloud','facebook','custom-rtmp']" :key="p" :value="p">{{ p }}</option></select></label>
          <label>Endpoint<input v-model="destinationDraft.endpointUrl" placeholder="rtmps://…" required></label>
          <label>Secret reference<input v-model="destinationDraft.streamKeyRef" placeholder="env:YOUTUBE_STREAM_KEY" required></label>
          <label>Protocol<select v-model="destinationDraft.protocol"><option>rtmp</option><option>rtmps</option></select></label>
          <label>Output profile<select v-model="destinationDraft.videoProfile" required><option value="" disabled>Select profile</option><option v-for="profile in compatibleProfiles" :key="profile.id" :value="profile.id">{{ profile.name }} · {{ profile.width }}×{{ profile.height }}/{{ profile.fps }}</option></select></label>
          <label>Monitoring<select v-model="destinationDraft.monitorMode"><option value="rtmp-output">FFmpeg output only</option><option value="platform-ack">Platform acknowledgment</option><option value="hls-playback">HLS playback</option></select></label>
          <label v-if="destinationDraft.monitorMode==='platform-ack'">Acknowledgment URL<input v-model="destinationDraft.providerAckUrl" type="url" placeholder="https://api.provider/status"></label>
          <label v-if="destinationDraft.monitorMode==='hls-playback'">Playback URL<input v-model="destinationDraft.hlsPlaybackUrl" type="url" placeholder="https://cdn.provider/live.m3u8"></label>
          <label>Metadata endpoint<input v-model="destinationDraft.providerMetadataUrl" type="url" placeholder="https://api.provider/metadata"></label>
          <label>Provider API secret<input v-model="destinationDraft.providerApiSecretRef" placeholder="env:YOUTUBE_API_TOKEN"></label>
          <label>Notes<textarea v-model="destinationDraft.notes"></textarea></label>
          <button class="control-button control-button--primary" type="submit">Save destination</button>
        </form>
        <div class="ops-panel"><h2>Configured outputs</h2><div class="card-list"><article v-for="item in destinations" :key="item.id" class="data-card"><div><strong>{{ item.label }}</strong><p>{{ item.provider }} · {{ item.status }} · {{ item.monitorMode }}</p><small>Profile: {{ profileLabel(item.videoProfile) }}</small><small>{{ item.endpointUrl }}</small></div><div v-if="isAdmin" class="inline-actions"><button @click="editDestination(item)">Edit</button><button class="danger" @click="deleteDestination(item)">Delete</button></div></article><p v-if="!destinations.length" class="empty">No destinations configured.</p></div></div>
      </div>
    </template>

    <template v-else-if="route==='schedule'">
      <form v-if="isOperator" class="ops-panel schedule-form" @submit.prevent="createSchedule"><input v-model="newSchedule.name" placeholder="Schedule name" required><select v-model="newSchedule.action"><option value="pipeline.start">Start pipeline</option><option value="pipeline.stop">Stop pipeline</option><option value="destination.enable">Enable destination</option><option value="destination.disable">Disable destination</option></select><input v-model="newSchedule.runAt" type="datetime-local" required><input v-model="newSchedule.recurrenceMinutes" type="number" min="1" placeholder="Repeat minutes"><button class="control-button control-button--primary">Create</button></form>
      <div class="ops-panel table-wrap" tabindex="0" aria-label="Schedules table"><table><thead><tr><th>Name</th><th>Action</th><th>Next run</th><th>Repeat</th><th>Failures</th><th></th></tr></thead><tbody><tr v-for="item in schedules" :key="item.id"><td>{{ item.name }}</td><td>{{ item.action }}</td><td>{{ new Date(item.nextRunAt).toLocaleString() }}</td><td>{{ item.recurrenceMinutes?`${item.recurrenceMinutes}m`:'once' }}</td><td>{{ item.failureCount }}</td><td><button v-if="isOperator" class="danger" @click="removeSchedule(item)">Delete</button></td></tr></tbody></table></div>
    </template>

    <template v-else-if="route==='archive'">
      <div class="ops-panel table-wrap" tabindex="0" aria-label="Sessions table"><table><thead><tr><th>Session</th><th>Title</th><th>Started</th><th>Ended</th><th>State</th></tr></thead><tbody><tr v-for="item in sessions" :key="item.id"><td class="mono">{{ item.id.slice(0,8) }}</td><td>{{ item.title }}</td><td>{{ new Date(item.startedAt).toLocaleString() }}</td><td>{{ item.endedAt?new Date(item.endedAt).toLocaleString():'—' }}</td><td>{{ item.online?'LIVE':'ARCHIVED' }}</td></tr></tbody></table></div>
    </template>

    <template v-else-if="route==='logs'">
      <div class="filter-bar"><input v-model="search" placeholder="Search logs"><select v-model="level"><option value="all">All levels</option><option v-for="v in ['debug','info','success','warning','error']" :key="v">{{ v }}</option></select></div>
      <div class="ops-panel log-stream"><article v-for="item in filteredLogs" :key="item.id" class="log-line" :data-level="item.level"><time>{{ new Date(item.timestamp).toLocaleTimeString() }}</time><b>{{ item.level }}</b><span>{{ item.source }}</span><p>{{ item.message }}</p></article><p v-if="!filteredLogs.length" class="empty">No matching logs.</p></div>
    </template>

    <template v-else-if="route==='status'">
      <div class="metric-grid"><article class="metric"><span>Workers</span><strong>{{ workers.length }}</strong></article><article class="metric"><span>Live outputs</span><strong>{{ workers.filter(w=>w.state==='running').length }}</strong></article><article class="metric"><span>Open incidents</span><strong>{{ incidents.filter(i=>i.status==='open').length }}</strong></article><article class="metric"><span>Memory</span><strong>{{ systemMetrics?systemMetrics.memory.usedPercent.toFixed(0)+'%':'—' }}</strong></article><article class="metric"><span>Disk</span><strong>{{ systemMetrics?.disk?systemMetrics.disk.usedPercent.toFixed(0)+'%':'—' }}</strong></article><article class="metric"><span>Load 1m</span><strong>{{ systemMetrics?systemMetrics.cpu.load1.toFixed(2):'—' }}</strong></article></div>
      <div class="ops-grid ops-grid--split"><div class="ops-panel"><h2>Destination workers</h2><article v-for="worker in workers" :key="worker.destinationId||worker.id" class="data-card"><div><strong>{{ worker.destinationId||worker.id }}</strong><p>{{ worker.state }} · restarts {{ worker.restartCount }}</p></div><span class="status-pill">{{ worker.health||'unknown' }}</span></article></div><div class="ops-panel"><h2>Provider delivery</h2><button v-if="isOperator" class="control-button" @click="probe()">Probe all</button><article v-for="item in providerProbes" :key="item.destinationId" class="data-card"><div><strong>{{ item.destinationId }}</strong><p>{{ item.message||'No provider response yet' }}</p><small>{{ item.checkedAt?new Date(item.checkedAt).toLocaleString():'not checked' }} · {{ item.latencyMs??'—' }}ms</small></div><span class="status-pill">{{ item.status }}</span></article></div></div>
      <div class="ops-grid ops-grid--split"><div class="ops-panel"><h2>Incidents</h2><article v-for="item in incidents" :key="item.id" class="incident" :data-severity="item.severity"><strong>{{ item.title }}</strong><p>{{ item.description }}</p><small>{{ item.source }} · {{ item.status }}</small><div v-if="item.status==='open'&&isOperator" class="resolve-row"><input v-model="resolution[item.id]" placeholder="Resolution"><button @click="resolveIncident(item)">Resolve</button></div></article></div><div class="ops-panel"><h2>System health</h2><dl v-if="systemMetrics"><dt>Process RSS</dt><dd>{{ (systemMetrics.process.rssBytes/1048576).toFixed(1) }} MB</dd><dt>Event loop p99</dt><dd>{{ systemMetrics.eventLoop.p99Ms.toFixed(1) }} ms</dd><dt>Network RX</dt><dd>{{ systemMetrics.network?Math.round(systemMetrics.network.receivedBytes/1048576)+' MB':'—' }}</dd><dt>Network TX</dt><dd>{{ systemMetrics.network?Math.round(systemMetrics.network.transmittedBytes/1048576)+' MB':'—' }}</dd></dl></div></div>
    </template>

    <template v-else-if="route==='about'">
      <div class="ops-grid ops-grid--split"><div class="ops-panel"><h2>Runtime</h2><dl><dt>Product</dt><dd>SYCO23 Multicast Control</dd><dt>Role</dt><dd>{{ user?.role }}</dd><dt>Actor</dt><dd>{{ user?.actor }}</dd><dt>Architecture</dt><dd>Vue control UI + isolated Node/FFmpeg runtime</dd></dl></div><div v-if="isAdmin" class="ops-panel"><h2>Database backups</h2><button class="control-button control-button--primary" @click="backup">Create backup</button><button class="control-button" @click="runRetention">Run retention</button><p v-if="retentionResult" class="muted">Removed {{ Object.values(retentionResult).reduce((a,b)=>a+b,0) }} expired records.</p><article v-for="item in backups" :key="item.id" class="data-card"><span class="mono">{{ item.id }}</span><button class="danger" @click="restore(item.id)">Restore</button></article></div></div>
      <RevisionHistoryPanel v-if="isAdmin" />
      <div v-if="isAdmin" class="ops-panel table-wrap" tabindex="0" aria-label="Audit trail table"><h2>Audit trail</h2><table><thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Resource</th><th>Outcome</th></tr></thead><tbody><tr v-for="item in audit" :key="item.id"><td>{{ new Date(item.timestamp).toLocaleString() }}</td><td>{{ item.actor }}</td><td>{{ item.action }}</td><td>{{ item.resource }}</td><td>{{ item.outcome }}</td></tr></tbody></table></div>
    </template>
  </section>
</template>

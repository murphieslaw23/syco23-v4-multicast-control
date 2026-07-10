import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

export type AppRoute = 'live'|'destinations'|'templates'|'schedule'|'archive'|'status'|'logs'|'overlay'|'about'
const valid = new Set<AppRoute>(['live','destinations','templates','schedule','archive','status','logs','overlay','about'])
const route = ref<AppRoute>('live')

function fromHash(): AppRoute {
  const value = location.hash.replace(/^#\/?/, '') as AppRoute
  return valid.has(value) ? value : 'live'
}

export function useAppRouter() {
  const sync = () => { route.value = fromHash() }
  onMounted(() => { sync(); addEventListener('hashchange', sync) })
  onBeforeUnmount(() => removeEventListener('hashchange', sync))
  const navigate = (next: AppRoute) => { location.hash = `/${next}`; route.value = next }
  return { route: computed(() => route.value), navigate }
}

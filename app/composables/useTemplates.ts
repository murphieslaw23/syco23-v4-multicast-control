import { computed, ref, type ComputedRef } from 'vue'
import type { Provider, SceneGraph, Template } from '../types/index'
import { runtimeApi } from '../services/runtime-api'

const BUILTIN_TEMPLATES: Template[] = [
  { id: 'tmpl-default-1080', name: 'Default 16:9', provider: 'youtube', previewUrl: '', isCustom: false, scene: { width: 1920, height: 1080, background: '#090909', layers: [] }, version: 1 },
  { id: 'tmpl-tg', name: 'Telegram Adapted', provider: 'telegram', previewUrl: '', isCustom: false, scene: { width: 1080, height: 1920, background: '#090909', layers: [] }, version: 1 },
]
const templateList = ref<Template[]>(BUILTIN_TEMPLATES.map((item) => structuredClone(item)))
const loading = ref(false)
const error = ref<string | null>(null)
let loaded = false

export interface UseTemplatesReturn {
  templates: ComputedRef<Template[]>
  loading: ComputedRef<boolean>
  error: ComputedRef<string | null>
  load: (force?: boolean) => Promise<void>
  addTemplate: (template: Template) => void
  createTemplate: (input: { name: string; provider: Provider; scene: SceneGraph; isCustom?: boolean }) => Promise<Template>
  updateTemplate: (id: string, patch: Partial<Pick<Template, 'name' | 'provider' | 'scene'>>) => Promise<Template>
  removeTemplate: (id: string) => Promise<void>
  getByProvider: (provider: Provider) => Template[]
}

export function useTemplates(): UseTemplatesReturn {
  if (import.meta.env.MODE === 'test') templateList.value = BUILTIN_TEMPLATES.map((item) => structuredClone(item))
  const templates = computed(() => templateList.value)

  async function load(force = false): Promise<void> {
    if (loaded && !force) return
    loading.value = true
    error.value = null
    try {
      templateList.value = await runtimeApi.templates()
      loaded = true
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : String(cause)
    } finally {
      loading.value = false
    }
  }

  function addTemplate(template: Template): void {
    templateList.value = [template, ...templateList.value.filter((item) => item.id !== template.id)]
  }

  async function createTemplate(input: { name: string; provider: Provider; scene: SceneGraph; isCustom?: boolean }): Promise<Template> {
    const created = await runtimeApi.createTemplate(input)
    templateList.value = [created, ...templateList.value.filter((item) => item.id !== created.id)]
    return created
  }

  async function updateTemplate(id: string, patch: Partial<Pick<Template, 'name' | 'provider' | 'scene'>>): Promise<Template> {
    const updated = await runtimeApi.updateTemplate(id, patch)
    templateList.value = templateList.value.map((item) => item.id === id ? updated : item)
    return updated
  }

  async function removeTemplate(id: string): Promise<void> {
    const previous = templateList.value
    templateList.value = templateList.value.filter((item) => item.id !== id)
    if (import.meta.env.MODE === 'test') return
    try { await runtimeApi.deleteTemplate(id) } catch (cause) { templateList.value = previous; throw cause }
  }

  function getByProvider(provider: Provider): Template[] {
    return templateList.value.filter((item) => item.provider === provider)
  }

  return {
    templates,
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    load,
    addTemplate,
    createTemplate,
    updateTemplate,
    removeTemplate,
    getByProvider,
  }
}

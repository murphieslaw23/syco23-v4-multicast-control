import { computed, ref, type ComputedRef } from 'vue'
import type { Template, Provider } from '../types/index'

export interface UseTemplatesReturn {
  templates: ComputedRef<Template[]>
  addTemplate: (tmpl: Template) => void
  removeTemplate: (id: string) => void
  getByProvider: (provider: Provider) => Template[]
}

export function useTemplates(): UseTemplatesReturn {
  const templateList = ref<Template[]>([
    {
      id: 'tmpl-default-1080',
      name: 'Default 16:9',
      provider: 'youtube',
      previewUrl: '/previews/youtube-1080.png',
      isCustom: false,
    },
    {
      id: 'tmpl-tg',
      name: 'Telegram Adapted',
      provider: 'telegram',
      previewUrl: '/previews/telegram.png',
      isCustom: false,
    },
  ])

  const templates = computed(() => templateList.value)

  function addTemplate(tmpl: Template) {
    templateList.value = [...templateList.value, tmpl]
  }

  function removeTemplate(id: string) {
    templateList.value = templateList.value.filter((t) => t.id !== id)
  }

  function getByProvider(provider: Provider): Template[] {
    return templateList.value.filter((t) => t.provider === provider)
  }

  return { templates, addTemplate, removeTemplate, getByProvider }
}

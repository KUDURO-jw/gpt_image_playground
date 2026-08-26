import { readRuntimeEnv } from './runtimeEnv'

/** 平台展示名称，可按部署需要修改。 */
export const PLATFORM_NAME = 'AI 图片工坊'
export const PLATFORM_BUILD = import.meta.env.PROD || readRuntimeEnv(import.meta.env.VITE_PLATFORM_BUILD) === 'true'

/** 仅允许使用平台预置线路；地址不会在设置界面明文展示。 */
export const PLATFORM_API_URLS = [
  'https://task-api-1-cn.65535.space',
  'https://meinianda.top',
] as const

export function getPlatformApiUrl(baseUrl: string) {
  return PLATFORM_API_URLS.find((url) => url === baseUrl.trim().replace(/\/+$/, '')) ?? PLATFORM_API_URLS[0]
}

export function getPlatformApiUrlPreview(baseUrl: string) {
  try {
    const url = new URL(getPlatformApiUrl(baseUrl))
    const visibleHost = url.hostname.length > 8 ? `${url.hostname.slice(0, 8)}...` : `${url.hostname.slice(0, 4)}...`
    return `${url.protocol}//${visibleHost}`
  } catch {
    return 'https://线路...'
  }
}

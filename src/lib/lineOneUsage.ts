import type { ApiProfile } from '../types'

const LINE_ONE_BASE_URL = 'https://task-api-1-cn.65535.space'

export function isLineOneUsageProfile(profile: Pick<ApiProfile, 'baseUrl'>) {
  return profile.baseUrl.trim().replace(/\/+$/, '') === LINE_ONE_BASE_URL
}

export function recordLineOneUsage(profile: Pick<ApiProfile, 'baseUrl' | 'apiKey'>, taskId: string, imageCount: number) {
  if (!isLineOneUsageProfile(profile) || !profile.apiKey.trim() || imageCount < 1) return

  void fetch('/api/line-one-usage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey: profile.apiKey.trim(), taskId, imageCount }),
  }).catch(() => {
    // 统计失败不影响已完成的图片任务。
  })
}

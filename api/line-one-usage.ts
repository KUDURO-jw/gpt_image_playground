import { createHmac } from 'node:crypto'

function sendJson(res: any, status: number, body: Record<string, unknown>) {
  res.status(status)
  res.setHeader('Content-Type', 'application/json')
  return res.json(body)
}

function readBody(req: any): Record<string, unknown> {
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body) as Record<string, unknown>
    } catch {
      return {}
    }
  }
  return req.body && typeof req.body === 'object' ? req.body as Record<string, unknown> : {}
}

async function callRedis(url: string, token: string, command: string, args: string[]) {
  const path = [command, ...args].map((item) => encodeURIComponent(item)).join('/')
  const response = await fetch(`${url}/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await response.json() as { result?: unknown, error?: string }
  if (!response.ok || data.error) throw new Error(data.error || '统计服务暂时不可用')
  return data.result
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return sendJson(res, 405, { error: '只支持 POST 请求' })
  }

  const redisUrl = process.env.USAGE_COUNTER_KV_REST_API_URL?.replace(/\/+$/, '')
  const redisToken = process.env.USAGE_COUNTER_KV_REST_API_TOKEN
  if (!redisUrl || !redisToken) return sendJson(res, 503, { error: '成功用量统计暂未启用' })

  const body = readBody(req)
  const apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : ''
  const taskId = typeof body.taskId === 'string' ? body.taskId.trim() : ''
  const imageCount = typeof body.imageCount === 'number' ? body.imageCount : 0
  const action = typeof body.action === 'string' ? body.action : 'record'
  if (!apiKey || apiKey.length > 512 || /[\r\n]/.test(apiKey)) return sendJson(res, 400, { error: 'API Key 格式无效' })

  const keyId = createHmac('sha256', redisToken).update(apiKey).digest('hex')
  const redisKey = `line-one-usage:${keyId}`

  try {
    if (action === 'lookup') {
      const total = await callRedis(redisUrl, redisToken, 'hget', [redisKey, 'total'])
      const totalUsed = typeof total === 'string' || typeof total === 'number' ? Number(total) : 0
      return sendJson(res, 200, { supported: true, totalUsed: Number.isFinite(totalUsed) ? totalUsed : 0 })
    }

    if (action !== 'record') return sendJson(res, 400, { error: '操作无效' })
    if (!/^[A-Za-z0-9_-]{1,160}$/.test(taskId)) return sendJson(res, 400, { error: '任务标识无效' })
    if (!Number.isInteger(imageCount) || imageCount < 1 || imageCount > 16) return sendJson(res, 400, { error: '图片数量无效' })

    const inserted = await callRedis(redisUrl, redisToken, 'hsetnx', [redisKey, `task:${taskId}`, String(imageCount)])
    if (Number(inserted) === 1) await callRedis(redisUrl, redisToken, 'hincrby', [redisKey, 'total', String(imageCount)])
    return sendJson(res, 200, { recorded: Number(inserted) === 1 })
  } catch (error) {
    console.warn('Line one usage counter request failed:', error)
    return sendJson(res, 502, { error: '成功用量统计暂时不可用，请稍后重试' })
  }
}

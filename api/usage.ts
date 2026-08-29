const MEINIANDA_URL = 'https://meinianda.top/api/usage/token/'

function sendJson(res: any, status: number, body: Record<string, unknown>) {
  res.status(status)
  res.setHeader('Content-Type', 'application/json')
  return res.json(body)
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return sendJson(res, 405, { error: '只支持 POST 请求' })
  }

  const body = typeof req.body === 'string'
    ? (() => {
        try { return JSON.parse(req.body) as Record<string, unknown> } catch { return {} }
      })()
    : req.body && typeof req.body === 'object' ? req.body as Record<string, unknown> : {}
  const route = typeof body.route === 'string' ? body.route : ''
  const apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : ''
  if (route !== 'meinianda') return sendJson(res, 400, { error: '当前线路暂不支持额度查询' })
  if (!apiKey) return sendJson(res, 400, { error: '请先填写 API Key' })
  if (apiKey.length > 512 || /[\r\n]/.test(apiKey)) return sendJson(res, 400, { error: 'API Key 格式无效' })

  try {
    const upstream = await fetch(MEINIANDA_URL, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
    })
    const text = await upstream.text()
    let data: unknown
    try {
      data = JSON.parse(text)
    } catch {
      data = null
    }
    if (!upstream.ok) {
      return sendJson(res, upstream.status, { error: '上游额度查询失败', upstreamStatus: upstream.status })
    }
    if (!data || typeof data !== 'object') return sendJson(res, 502, { error: '上游返回格式无效' })

    const payload = data as { data?: Record<string, unknown>, success?: boolean, code?: boolean, message?: string }
    const usage = payload.data
    if (!usage || typeof usage !== 'object') return sendJson(res, 502, { error: payload.message || '上游未返回额度信息' })

    const numberValue = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : null
    return sendJson(res, 200, {
      supported: true,
      route: '线路二',
      totalAvailable: numberValue(usage.total_available),
      totalGranted: numberValue(usage.total_granted),
      totalUsed: numberValue(usage.total_used),
      unlimitedQuota: usage.unlimited_quota === true,
      name: typeof usage.name === 'string' ? usage.name : undefined,
    })
  } catch (error) {
    console.warn('Usage proxy request failed:', error)
    return sendJson(res, 502, { error: '额度查询网络请求失败，请稍后重试' })
  }
}

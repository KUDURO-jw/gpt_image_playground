import { describe, expect, it } from 'vitest'
import { isLineOneUsageProfile } from './lineOneUsage'

describe('line one usage tracking', () => {
  it('only enables tracking for the exact line one address', () => {
    expect(isLineOneUsageProfile({ baseUrl: 'https://task-api-1-cn.65535.space/' })).toBe(true)
    expect(isLineOneUsageProfile({ baseUrl: 'https://meinianda.top' })).toBe(false)
    expect(isLineOneUsageProfile({ baseUrl: 'https://another-api.example.com' })).toBe(false)
  })
})

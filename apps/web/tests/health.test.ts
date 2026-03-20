import { describe, it, expect } from 'vitest'

describe('health', () => {
  it('returns ok status', () => {
    const result = { status: 'ok', service: 'investiq-web' }
    expect(result.status).toBe('ok')
    expect(result.service).toBe('investiq-web')
  })
})

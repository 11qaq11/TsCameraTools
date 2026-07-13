import { describe, it, expect, vi } from 'vitest'
import { Request, Response, NextFunction } from 'express'
import { requestIdMiddleware, getRequestId } from './request-id'

function createMockReq(headers: Record<string, string> = {}): Partial<Request> {
  return { headers } as Partial<Request>
}

function createMockRes(): { setHeader: ReturnType<typeof vi.fn> } {
  return { setHeader: vi.fn() }
}

function runMiddleware(headers: Record<string, string> = {}) {
  const req = createMockReq(headers)
  const res = createMockRes()
  const next = vi.fn()
  requestIdMiddleware(req as Request, res as unknown as Response, next as NextFunction)
  return { req, res, next }
}

describe('requestIdMiddleware', () => {
  it('应该为没有 X-Request-Id 的请求生成 UUID', () => {
    const { req, res } = runMiddleware()

    expect((req as any).requestId).toBeDefined()
    expect((req as any).requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    )
    expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', (req as any).requestId)
  })

  it('应该使用已有的 X-Request-Id header', () => {
    const existingId = 'existing-request-id-123'
    const { req, res } = runMiddleware({ 'x-request-id': existingId })

    expect((req as any).requestId).toBe(existingId)
    expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', existingId)
  })

  it('应该调用 next()', () => {
    const { next } = runMiddleware()
    expect(next).toHaveBeenCalledOnce()
  })
})

describe('getRequestId', () => {
  it('应该返回请求上的 requestId', () => {
    const req = createMockReq()
    ;(req as any).requestId = 'test-id-123'
    expect(getRequestId(req as Request)).toBe('test-id-123')
  })

  it('应该在没有 requestId 时返回 undefined', () => {
    const req = createMockReq()
    expect(getRequestId(req as Request)).toBeUndefined()
  })
})

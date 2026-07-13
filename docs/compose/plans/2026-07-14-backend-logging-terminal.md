# Backend Logging & Terminal Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve backend debugging capabilities with structured logging and enhance local terminal UX with better font and prompt formatting.

**Architecture:** Replace ad-hoc debug logging with pino (structured JSON logger), add request ID middleware for request tracing, expose logs via API endpoint. Update ttyd terminal configuration with Cascadia Mono font and custom cmd.exe prompt.

**Tech Stack:** pino, pino-http, uuid (for request IDs)

## Global Constraints

- Node.js backend in `server/` directory
- Existing debug-logger pattern to be replaced
- ttyd binary at `bin/ttyd/ttyd.exe`
- Font must be web-safe fallback chain
- All changes must pass `npm run web:build`

---

### Task 1: Install pino dependencies

**Covers:** [S1]

**Files:**
- Modify: `package.json`

**Interfaces:**
- Produces: pino, pino-http packages available for import

- [ ] **Step 1: Install pino and pino-http**

```bash
npm install pino pino-http
npm install -D @types/pino @types/pino-http
```

- [ ] **Step 2: Verify installation**

```bash
npm ls pino pino-http
```

Expected: Both packages listed without errors

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add pino logging dependencies"
```

---

### Task 2: Create logger utility

**Covers:** [S1, S2]

**Files:**
- Create: `server/utils/logger.ts`
- Delete: `server/utils/debug-logger.ts`

**Interfaces:**
- Produces: `logger` (pino instance), `createChildLogger(context)` function
- Consumes: `process.env.DEBUG`, `process.env.LOG_LEVEL`

- [ ] **Step 1: Write failing test for logger**

Create `server/utils/logger.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { logger, createChildLogger } from './logger'

describe('Logger', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should export a pino logger instance', () => {
    expect(logger).toBeDefined()
    expect(typeof logger.info).toBe('function')
    expect(typeof logger.error).toBe('function')
    expect(typeof logger.warn).toBe('function')
    expect(typeof logger.debug).toBe('function')
  })

  it('should create child logger with context', () => {
    const child = createChildLogger('TestContext')
    expect(child).toBeDefined()
    expect(typeof child.info).toBe('function')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:server -- server/utils/logger.test.ts
```

Expected: FAIL with "Cannot find module './logger'"

- [ ] **Step 3: Implement logger utility**

Create `server/utils/logger.ts`:

```typescript
import pino from 'pino'

const isDebug = process.env.DEBUG === 'true'
const logLevel = process.env.LOG_LEVEL || (isDebug ? 'debug' : 'info')

export const logger = pino({
  level: logLevel,
  transport: {
    target: 'pino/file',
    options: { destination: 1 }, // stdout
  },
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() }
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
})

export function createChildLogger(context: string) {
  return logger.child({ context })
}

export { isDebug }
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test:server -- server/utils/logger.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/utils/logger.ts server/utils/logger.test.ts
git commit -m "feat: add pino logger utility"
```

---

### Task 3: Add request ID middleware

**Covers:** [S2]

**Files:**
- Create: `server/middleware/request-id.ts`
- Create: `server/middleware/request-id.test.ts`

**Interfaces:**
- Produces: `requestIdMiddleware` (Express middleware), `getRequestId(req)` function
- Consumes: `uuid` package

- [ ] **Step 1: Write failing test**

Create `server/middleware/request-id.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { requestIdMiddleware, getRequestId } from './request-id'
import { Request, Response, NextFunction } from 'express'

describe('Request ID Middleware', () => {
  it('should add request ID to request object', () => {
    const req = { headers: {} } as Request
    const res = {
      setHeader: vi.fn(),
    } as unknown as Response
    const next = vi.fn() as NextFunction

    requestIdMiddleware(req, res, next)

    expect(req.requestId).toBeDefined()
    expect(typeof req.requestId).toBe('string')
    expect(next).toHaveBeenCalled()
  })

  it('should use existing X-Request-Id header', () => {
    const req = {
      headers: { 'x-request-id': 'existing-id' },
    } as Request
    const res = {
      setHeader: vi.fn(),
    } as unknown as Response
    const next = vi.fn() as NextFunction

    requestIdMiddleware(req, res, next)

    expect(req.requestId).toBe('existing-id')
    expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', 'existing-id')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:server -- server/middleware/request-id.test.ts
```

Expected: FAIL with "Cannot find module './request-id'"

- [ ] **Step 3: Implement middleware**

Create `server/middleware/request-id.ts`:

```typescript
import { Request, Response, NextFunction } from 'express'
import { v4 as uuidv4 } from 'uuid'

declare global {
  namespace Express {
    interface Request {
      requestId?: string
    }
  }
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const requestId = (req.headers['x-request-id'] as string) || uuidv4()
  req.requestId = requestId
  res.setHeader('X-Request-Id', requestId)
  next()
}

export function getRequestId(req: Request): string {
  return req.requestId || 'unknown'
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test:server -- server/middleware/request-id.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/middleware/request-id.ts server/middleware/request-id.test.ts
git commit -m "feat: add request ID middleware"
```

---

### Task 4: Create debug logs API endpoint

**Covers:** [S3]

**Files:**
- Create: `server/routes/debug.ts`
- Create: `server/routes/debug.test.ts`
- Modify: `server/index.ts`

**Interfaces:**
- Produces: `GET /api/debug/logs` endpoint, `GET /api/debug/logs/stream` (SSE)
- Consumes: `logger` from Task 2, `requestIdMiddleware` from Task 3

- [ ] **Step 1: Write failing test**

Create `server/routes/debug.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import debugRoutes from './debug'

describe('Debug Routes', () => {
  let app: express.Application

  beforeEach(() => {
    app = express()
    app.use('/api/debug', debugRoutes)
  })

  it('GET /api/debug/logs should return logs array', async () => {
    const res = await request(app).get('/api/debug/logs')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('logs')
    expect(Array.isArray(res.body.logs)).toBe(true)
  })

  it('GET /api/debug/logs should support level filter', async () => {
    const res = await request(app).get('/api/debug/logs?level=error')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('logs')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:server -- server/routes/debug.test.ts
```

Expected: FAIL with "Cannot find module './debug'"

- [ ] **Step 3: Implement debug routes**

Create `server/routes/debug.ts`:

```typescript
import { Router, Request, Response } from 'express'
import { logger } from '../utils/logger.js'

const router = Router()

// In-memory log buffer (last 1000 entries)
const logBuffer: Array<{
  timestamp: string
  level: string
  context?: string
  message: string
  [key: string]: unknown
}> = []
const MAX_BUFFER_SIZE = 1000

// Listen to pino events to capture logs
const originalLogger = logger
const originalInfo = originalLogger.info.bind(originalLogger)
const originalError = originalLogger.error.bind(originalLogger)
const originalWarn = originalLogger.warn.bind(originalLogger)
const originalDebug = originalLogger.debug.bind(originalLogger)

function captureLog(level: string, args: unknown[]) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message: '',
    context: undefined as string | undefined,
  }

  if (typeof args[0] === 'string') {
    entry.message = args[0]
  } else if (typeof args[0] === 'object' && args[0] !== null) {
    const obj = args[0] as Record<string, unknown>
    entry.context = obj.context as string
    entry.message = (obj.msg as string) || ''
    Object.assign(entry, obj)
  }

  logBuffer.push(entry)
  if (logBuffer.length > MAX_BUFFER_SIZE) {
    logBuffer.shift()
  }
}

// Patch logger methods to capture logs
originalLogger.info = (...args: unknown[]) => {
  captureLog('INFO', args)
  return originalInfo(...args as [any])
}
originalLogger.error = (...args: unknown[]) => {
  captureLog('ERROR', args)
  return originalError(...args as [any])
}
originalLogger.warn = (...args: unknown[]) => {
  captureLog('WARN', args)
  return originalWarn(...args as [any])
}
originalLogger.debug = (...args: unknown[]) => {
  captureLog('DEBUG', args)
  return originalDebug(...args as [any])
}

// GET /api/debug/logs - Get recent logs
router.get('/logs', (req: Request, res: Response) => {
  const level = req.query.level as string
  const limit = parseInt(req.query.limit as string) || 100
  const offset = parseInt(req.query.offset as string) || 0

  let filtered = logBuffer
  if (level) {
    filtered = logBuffer.filter(log => log.level.toLowerCase() === level.toLowerCase())
  }

  const logs = filtered.slice(-limit - offset, -offset || undefined)

  res.json({
    total: filtered.length,
    limit,
    offset,
    logs,
  })
})

// GET /api/debug/logs/stream - SSE stream for real-time logs
router.get('/logs/stream', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  const level = req.query.level as string

  const interval = setInterval(() => {
    const recentLogs = logBuffer.slice(-10)
    const filtered = level
      ? recentLogs.filter(log => log.level.toLowerCase() === level.toLowerCase())
      : recentLogs

    res.write(`data: ${JSON.stringify(filtered)}\n\n`)
  }, 1000)

  req.on('close', () => {
    clearInterval(interval)
  })
})

export default router
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test:server -- server/routes/debug.test.ts
```

Expected: PASS

- [ ] **Step 5: Register routes in server/index.ts**

Add to `server/index.ts` after other route registrations:

```typescript
import debugRoutes from './routes/debug.js'

// ... existing routes ...
app.use('/api/debug', debugRoutes)
```

- [ ] **Step 6: Run full test suite**

```bash
npm run test:all
```

Expected: All tests pass

- [ ] **Step 7: Commit**

```bash
git add server/routes/debug.ts server/routes/debug.test.ts server/index.ts
git commit -m "feat: add debug logs API endpoint"
```

---

### Task 5: Replace debug-logger with pino in ttyd service

**Covers:** [S1, S2]

**Files:**
- Modify: `server/services/ttyd.ts`

**Interfaces:**
- Consumes: `createChildLogger` from Task 2
- Produces: Structured logs with context 'Ttyd'

- [ ] **Step 1: Update imports in ttyd.ts**

Replace:
```typescript
import { debugLog } from '../utils/debug-logger.js'
```

With:
```typescript
import { createChildLogger } from '../utils/logger.js'

const log = createChildLogger('Ttyd')
```

- [ ] **Step 2: Replace all debugLog calls**

Replace all `debugLog('Ttyd', ...)` calls with `log.debug(...)`, `log.info(...)`, `log.error(...)`, etc.

Example transformations:
- `debugLog('Ttyd', `findAvailablePort: scanning range ${start}-${end}`)` → `log.debug(`findAvailablePort: scanning range ${start}-${end}`)`
- `debugLog('Ttyd', 'startSession: FAILED - ttyd binary not found')` → `log.error('startSession: FAILED - ttyd binary not found')`
- `debugLog('Ttyd', `startSession: process ERROR`, { ... })` → `log.error({ ... }, 'startSession: process ERROR')`

- [ ] **Step 3: Remove debug-logger import**

Delete the import statement and any references to `isDebug`.

- [ ] **Step 4: Run tests to verify**

```bash
npm run test:server
```

Expected: All server tests pass

- [ ] **Step 5: Commit**

```bash
git add server/services/ttyd.ts
git commit -m "refactor: replace debug-logger with pino in ttyd service"
```

---

### Task 6: Update local terminal font

**Covers:** [S4]

**Files:**
- Modify: `server/services/ttyd.ts`

**Interfaces:**
- Produces: ttyd terminal with Cascadia Mono font

- [ ] **Step 1: Update ttyd args for local session**

In `startLocalSession()` function, update the args array:

```typescript
const args = [
  '-p', String(port),
  '-i', '127.0.0.1',
  '--writable',
  '-t', 'fontSize=14',
  '-t', `fontFamily='Cascadia Mono', Consolas, 'Courier New', monospace`,
  '-t', `theme=${themeJson}`,
  '-t', 'disableResizeOverlay=true',
  'cmd.exe',
]
```

- [ ] **Step 2: Update ttyd args for ADB session**

In `startSession()` function, update the args array similarly:

```typescript
const args = [
  '-p', String(port),
  '-i', '127.0.0.1',
  '--writable',
  '-t', `fontSize=14`,
  '-t', `fontFamily='Cascadia Mono', Consolas, 'Courier New', monospace`,
  '-t', `theme=${themeJson}`,
  '-t', `corsCredential=true`,
  '-t', `origin=${frontendUrl}`,
  '-t', 'disableResizeOverlay=true',
  'adb', '-s', serial, 'shell',
]
```

- [ ] **Step 3: Verify build passes**

```bash
npm run web:build
```

Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add server/services/ttyd.ts
git commit -m "feat: update terminal font to Cascadia Mono"
```

---

### Task 7: Add space after cmd.exe prompt

**Covers:** [S5]

**Files:**
- Modify: `server/services/ttyd.ts`

**Interfaces:**
- Produces: cmd.exe with `$P$G ` prompt (directory + `>` + space)

- [ ] **Step 1: Add PROMPT environment variable**

In `startLocalSession()`, update the spawn options:

```typescript
const child = spawn(binary.path, args, {
  stdio: ['pipe', 'pipe', 'pipe'],
  cwd: homeDir,
  env: {
    ...process.env,
    LANG: 'en_US.UTF-8',
    PROMPT: '$P$G ',  // Adds space after >
  },
})
```

- [ ] **Step 2: Verify build passes**

```bash
npm run web:build
```

Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add server/services/ttyd.ts
git commit -m "feat: add space after cmd.exe prompt"
```

---

### Task 8: Delete old debug-logger

**Covers:** [S1]

**Files:**
- Delete: `server/utils/debug-logger.ts`
- Delete: `server/utils/debug-logger.test.ts` (if exists)

**Interfaces:**
- None (cleanup task)

- [ ] **Step 1: Verify no remaining imports**

```bash
grep -r "debug-logger" server/ --include="*.ts"
```

Expected: No results

- [ ] **Step 2: Delete the files**

```bash
rm server/utils/debug-logger.ts
rm -f server/utils/debug-logger.test.ts
```

- [ ] **Step 3: Run full test suite**

```bash
npm run test:all
```

Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove old debug-logger"
```

---

### Task 9: Final verification

**Covers:** [S1-S5]

**Files:**
- None (verification only)

- [ ] **Step 1: Run web build**

```bash
npm run web:build
```

Expected: Build succeeds

- [ ] **Step 2: Run all tests**

```bash
npm run test:all
```

Expected: All tests pass

- [ ] **Step 3: Run lint**

```bash
npm run lint
```

Expected: No new errors

- [ ] **Step 4: Manual testing checklist**

1. Start server: `npm run server:dev`
2. Open browser to `http://localhost:5173`
3. Navigate to Local Terminal page
4. Verify:
   - Font is Cascadia Mono (check rendering)
   - Prompt shows `C:\Users\Administrator> ` (with space)
5. Call `GET /api/debug/logs` endpoint
6. Verify response contains structured JSON logs

- [ ] **Step 5: Final commit if needed**

```bash
git add -A
git commit -m "feat: backend logging improvements and terminal enhancements"
```

---

## Summary

| Task | Description | Files Changed |
|------|-------------|---------------|
| 1 | Install pino dependencies | package.json |
| 2 | Create logger utility | server/utils/logger.ts |
| 3 | Add request ID middleware | server/middleware/request-id.ts |
| 4 | Create debug logs API | server/routes/debug.ts, server/index.ts |
| 5 | Replace debug-logger in ttyd | server/services/ttyd.ts |
| 6 | Update terminal font | server/services/ttyd.ts |
| 7 | Add prompt space | server/services/ttyd.ts |
| 8 | Delete old debug-logger | server/utils/debug-logger.ts |
| 9 | Final verification | N/A |

**Total Tasks:** 9
**Estimated Time:** 30-45 minutes

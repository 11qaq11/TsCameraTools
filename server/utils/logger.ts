import pino from 'pino'

const level = process.env.LOG_LEVEL || 'info'

export const logger = pino({
  level,
})

export function createChildLogger(context: Record<string, string>) {
  return logger.child(context)
}

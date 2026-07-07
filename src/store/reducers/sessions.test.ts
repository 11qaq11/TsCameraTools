import { describe, it, expect, beforeEach } from 'vitest'
import sessionsReducer, {
  addSession,
  removeSession,
  setActiveSession,
  clearSessions,
} from '../reducers/sessions'
import type { SessionState } from '../../types/hyper'

describe('sessions reducer', () => {
  let initialState: ReturnType<typeof sessionsReducer>

  beforeEach(() => {
    initialState = sessionsReducer(undefined, { type: '@@INIT' })
  })

  describe('会话管理', () => {
    it('应该正确创建新会话', () => {
      const session: SessionState = {
        uid: 'session-1',
        title: 'Test Session',
        cols: 80,
        rows: 24,
        active: true,
        pid: 1234,
      }
      const state = sessionsReducer(initialState, addSession(session))
      expect(state.sessions['session-1']).toBeDefined()
      expect(state.activeUid).toBe('session-1')
    })

    it('应该正确关闭会话', () => {
      const session: SessionState = {
        uid: 'session-1',
        title: 'Test Session',
        cols: 80,
        rows: 24,
        active: true,
        pid: 1234,
      }
      let state = sessionsReducer(initialState, addSession(session))
      state = sessionsReducer(state, removeSession('session-1'))
      expect(state.sessions['session-1']).toBeUndefined()
    })

    it('应该正确切换会话', () => {
      const session1: SessionState = {
        uid: 'session-1',
        title: 'Session 1',
        cols: 80,
        rows: 24,
        active: true,
        pid: 1234,
      }
      const session2: SessionState = {
        uid: 'session-2',
        title: 'Session 2',
        cols: 80,
        rows: 24,
        active: false,
        pid: 5678,
      }
      let state = sessionsReducer(initialState, addSession(session1))
      state = sessionsReducer(state, addSession(session2))
      state = sessionsReducer(state, setActiveSession('session-2'))
      expect(state.activeUid).toBe('session-2')
      expect(state.sessions['session-2'].active).toBe(true)
    })

    it('应该正确清空所有会话', () => {
      const session: SessionState = {
        uid: 'session-1',
        title: 'Test Session',
        cols: 80,
        rows: 24,
        active: true,
        pid: 1234,
      }
      let state = sessionsReducer(initialState, addSession(session))
      state = sessionsReducer(state, clearSessions())
      expect(Object.keys(state.sessions)).toHaveLength(0)
      expect(state.activeUid).toBeNull()
    })
  })
})

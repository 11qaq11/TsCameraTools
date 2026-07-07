// Sessions Reducer - 管理终端会话状态
// 参考: https://github.com/vercel/hyper/blob/canary/lib/reducers/sessions.ts

import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { SessionState, SessionsState } from '../../types/hyper'

const initialState: SessionsState = {
  sessions: {},
  activeUid: null
}

const sessionsSlice = createSlice({
  name: 'sessions',
  initialState,
  reducers: {
    // 添加会话
    addSession: (state, action: PayloadAction<SessionState>) => {
      const { uid } = action.payload
      state.sessions[uid] = action.payload
      state.activeUid = uid
    },
    
    // 移除会话
    removeSession: (state, action: PayloadAction<string>) => {
      const uid = action.payload
      delete state.sessions[uid]
      if (state.activeUid === uid) {
        const uids = Object.keys(state.sessions)
        state.activeUid = uids.length > 0 ? uids[0] : null
      }
    },
    
    // 设置活动会话
    setActiveSession: (state, action: PayloadAction<string>) => {
      const uid = action.payload
      if (state.sessions[uid]) {
        // 取消所有会话的活动状态
        Object.values(state.sessions).forEach(session => {
          session.active = false
        })
        // 设置新活动会话
        state.sessions[uid].active = true
        state.activeUid = uid
      }
    },
    
    // 更新会话标题
    setSessionTitle: (state, action: PayloadAction<{ uid: string; title: string }>) => {
      const { uid, title } = action.payload
      if (state.sessions[uid]) {
        state.sessions[uid].title = title
      }
    },
    
    // 更新会话大小
    resizeSession: (state, action: PayloadAction<{ uid: string; cols: number; rows: number }>) => {
      const { uid, cols, rows } = action.payload
      if (state.sessions[uid]) {
        state.sessions[uid].cols = cols
        state.sessions[uid].rows = rows
      }
    },
    
    // 设置会话 PID
    setSessionPid: (state, action: PayloadAction<{ uid: string; pid: number }>) => {
      const { uid, pid } = action.payload
      if (state.sessions[uid]) {
        state.sessions[uid].pid = pid
      }
    },
    
    // 清除所有会话
    clearSessions: (state) => {
      state.sessions = {}
      state.activeUid = null
    }
  }
})

export const {
  addSession,
  removeSession,
  setActiveSession,
  setSessionTitle,
  resizeSession,
  setSessionPid,
  clearSessions
} = sessionsSlice.actions

export default sessionsSlice.reducer

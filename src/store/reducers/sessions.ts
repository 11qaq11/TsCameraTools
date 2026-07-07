import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

interface SessionState {
  uid: string
  title: string
  cols: number
  rows: number
  active: boolean
  shell: string
  pid: number | null
}

interface SessionsState {
  sessions: Record<string, SessionState>
  activeUid: string | null
}

const initialState: SessionsState = {
  sessions: {},
  activeUid: null,
}

const sessionsSlice = createSlice({
  name: 'sessions',
  initialState,
  reducers: {
    addSession: (state, action: PayloadAction<SessionState>) => {
      const { uid } = action.payload
      state.sessions[uid] = action.payload
      state.activeUid = uid
    },
    removeSession: (state, action: PayloadAction<string>) => {
      const uid = action.payload
      delete state.sessions[uid]
      if (state.activeUid === uid) {
        const uids = Object.keys(state.sessions)
        state.activeUid = uids.length > 0 ? uids[0] : null
      }
    },
    setActiveSession: (state, action: PayloadAction<string>) => {
      const uid = action.payload
      if (state.sessions[uid]) {
        Object.values(state.sessions).forEach(session => {
          session.active = false
        })
        state.sessions[uid].active = true
        state.activeUid = uid
      }
    },
    setSessionTitle: (state, action: PayloadAction<{ uid: string; title: string }>) => {
      const { uid, title } = action.payload
      if (state.sessions[uid]) {
        state.sessions[uid].title = title
      }
    },
    resizeSession: (state, action: PayloadAction<{ uid: string; cols: number; rows: number }>) => {
      const { uid, cols, rows } = action.payload
      if (state.sessions[uid]) {
        state.sessions[uid].cols = cols
        state.sessions[uid].rows = rows
      }
    },
    setSessionPid: (state, action: PayloadAction<{ uid: string; pid: number }>) => {
      const { uid, pid } = action.payload
      if (state.sessions[uid]) {
        state.sessions[uid].pid = pid
      }
    },
    clearSessions: (state) => {
      state.sessions = {}
      state.activeUid = null
    },
  },
})

export const {
  addSession,
  removeSession,
  setActiveSession,
  setSessionTitle,
  resizeSession,
  setSessionPid,
  clearSessions,
} = sessionsSlice.actions

export default sessionsSlice.reducer

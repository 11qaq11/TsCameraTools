// Redux Store 配置
// 参考: https://github.com/vercel/hyper/blob/canary/lib/store/index.ts

import { configureStore } from '@reduxjs/toolkit'
import uiReducer from './reducers/ui'
import sessionsReducer from './reducers/sessions'
import memoryReducer from './memory'

export const store = configureStore({
  reducer: {
    ui: uiReducer,
    sessions: sessionsReducer,
    memory: memoryReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false
    })
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

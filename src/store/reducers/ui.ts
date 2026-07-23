import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

interface ToolSnapshot {
  // 设备连接
  selectedDevice?: string | null
  // 内存分析
  memoryStage?: string
  memorySelectedNames?: string[]
}

interface UiState {
  fontSize: number
  fontFamily: string
  maximized: boolean
  fullScreen: boolean
  // 最近使用的工具 ID 列表（最近使用在前）
  recentTools: string[]
  // 当前激活的工具 ID
  activeTool: string
  // 各工具的状态快照
  toolSnapshots: Record<string, ToolSnapshot>
  // 已启用的工具 ID 列表（工具市场）
  enabledTools: string[]
}

const MAX_RECENT_TOOLS = 5
const ALL_TOOL_IDS = ['devices', 'memory']

const initialState: UiState = {
  fontSize: 14,
  fontFamily: "'Consolas', 'Microsoft YaHei', monospace",
  maximized: false,
  fullScreen: false,
  recentTools: ['devices'],
  activeTool: 'devices',
  toolSnapshots: {},
  enabledTools: ALL_TOOL_IDS,
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setFontSize: (state, action: PayloadAction<number>) => {
      state.fontSize = action.payload
    },
    setFontFamily: (state, action: PayloadAction<string>) => {
      state.fontFamily = action.payload
    },
    setMaximized: (state, action: PayloadAction<boolean>) => {
      state.maximized = action.payload
    },
    setFullScreen: (state, action: PayloadAction<boolean>) => {
      state.fullScreen = action.payload
    },
    applyConfig: (state, action: PayloadAction<Partial<UiState>>) => {
      return { ...state, ...action.payload }
    },
    resetToDefaults: () => {
      return initialState
    },
    // 切换工具
    switchTool: (state, action: PayloadAction<string>) => {
      const toolId = action.payload
      // 只在工具不存在时追加到列表，保持打开顺序
      if (!state.recentTools.includes(toolId)) {
        state.recentTools = [...state.recentTools, toolId].slice(0, MAX_RECENT_TOOLS)
      }
      state.activeTool = toolId
    },
    // 保存工具状态快照
    saveToolSnapshot: (state, action: PayloadAction<{ toolId: string; snapshot: ToolSnapshot }>) => {
      const { toolId, snapshot } = action.payload
      state.toolSnapshots[toolId] = snapshot
    },
    // 清除工具状态快照
    clearToolSnapshot: (state, action: PayloadAction<string>) => {
      delete state.toolSnapshots[action.payload]
    },
    // 切换工具启用状态
    toggleTool: (state, action: PayloadAction<string>) => {
      const toolId = action.payload
      if (state.enabledTools.includes(toolId)) {
        state.enabledTools = state.enabledTools.filter(id => id !== toolId)
      } else {
        state.enabledTools = [...state.enabledTools, toolId]
      }
    },
  },
})

export const {
  setFontSize,
  setFontFamily,
  setMaximized,
  setFullScreen,
  applyConfig,
  resetToDefaults,
  switchTool,
  saveToolSnapshot,
  clearToolSnapshot,
  toggleTool,
} = uiSlice.actions

export default uiSlice.reducer

import { resolve } from 'node:path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        // poller-worker 作为独立入口产出 out/main/poller-worker.js，
        // 供 poller.ts 用 new Worker(join(__dirname,'poller-worker.js')) 加载。
        // 不被 index 引用（仅按路径字符串加载），rollup 不会把它并入主 bundle。
        input: {
          index: resolve(__dirname, 'src/main/index.ts'),
          'poller-worker': resolve(__dirname, 'src/main/poller-worker.ts')
        },
        output: { entryFileNames: '[name].js' }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, 'src/preload/index.ts') }
      }
    }
  },
  renderer: {
    root: 'src/renderer',
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, 'src/renderer/index.html') }
      }
    },
    resolve: {
      alias: { '@renderer': resolve(__dirname, 'src/renderer/src') }
    },
    plugins: [react()]
  }
})

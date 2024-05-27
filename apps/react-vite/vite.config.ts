import reactPlugin from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tsconfigPathsPlugin from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [reactPlugin(), tsconfigPathsPlugin()],
})

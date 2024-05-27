import { defineConfig } from 'vite'
import solidPlugin from 'vite-plugin-solid'
import tsconfigPathsPlugin from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [solidPlugin(), tsconfigPathsPlugin()],
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // Served from https://qubered.github.io/deckcheck/ on GitHub Pages, so
  // production asset URLs need the repo name as a base path; the dev server
  // still serves from /.
  base: command === 'build' ? '/deckcheck/' : '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  worker: {
    format: 'es',
  },
}))

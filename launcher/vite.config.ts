import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: './',
  server: { port: 5174 },
  resolve: {
    alias: [
      // @/docs → front docs data (more specific, must come first)
      { find: /^@\/docs/, replacement: path.resolve(__dirname, '../front/src/docs') },
      // @/ → launcher src
      { find: '@', replacement: path.resolve(__dirname, './src') },
    ],
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        docs: path.resolve(__dirname, 'docs.html'),
      },
      output: { manualChunks: undefined },
    },
  },
})

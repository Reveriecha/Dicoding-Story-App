import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  root: '.',
  base: './',
  publicDir: 'public',
  server: {
    port: 3000,
    host: true,
    open: true,
    hmr: {
      protocol: 'ws', 
      host: 'localhost', 
      port: 3000, 
    },
    cors: true,
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: './index.html'
      }
    },
    copyPublicDir: true
  },
  preview: {
    port: 3000,
    host: true
  }
})

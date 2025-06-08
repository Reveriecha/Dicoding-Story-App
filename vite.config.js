import { defineConfig } from 'vite'

export default defineConfig({
  root: '.',
  base: './',
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
    }
  },
  preview: {
    port: 3000,
    host: true
  }
})

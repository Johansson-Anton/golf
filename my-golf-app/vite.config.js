import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/golf/', // <-- IMPORTANT: Replace 'my-golf-app' with your actual repository name
})
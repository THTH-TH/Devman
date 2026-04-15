import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// All source files and node_modules live at C:\Users\tim\devman (outside Google Drive)
// to avoid EBADF file locking issues from Google Drive sync.
export default defineConfig({
  plugins: [react()],
  root: 'C:\\Users\\tim\\devman',
})

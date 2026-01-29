import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/causeway/',
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api/ollama': {
        target: 'http://localhost:11434',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ollama/, '/api'),
      },
    },
  },
  define: {
    // Map shell environment variables to VITE_ variables
    'import.meta.env.VITE_AZURE_OPENAI_API_KEY': JSON.stringify(
      process.env.AZURE_OPENAI_API_KEY || ''
    ),
    'import.meta.env.VITE_AZURE_OPENAI_ENDPOINT': JSON.stringify(
      process.env.AZURE_OPENAI_ENDPOINT || process.env.AZURE_ENDPOINT || ''
    ),
    'import.meta.env.VITE_AZURE_OPENAI_DEPLOYMENT': JSON.stringify(
      process.env.AZURE_AI_MODEL_DEPLOYMENT_NAME || 'gpt-4o'
    ),
  },
})

import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())
  const supabaseUrl = env.VITE_SUPABASE_URL || ''

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      headers: {
        // Prevent MIME type sniffing
        'X-Content-Type-Options': 'nosniff',
        // Prevent clickjacking attacks
        'X-Frame-Options': 'DENY',
        // Enable XSS protection
        'X-XSS-Protection': '1; mode=block',
        // Content Security Policy
        'Content-Security-Policy': `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' ${supabaseUrl} https://*.supabase.co`,
        // Referrer Policy
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        // Permissions Policy
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      },
    },
  }
})

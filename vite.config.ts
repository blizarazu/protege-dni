import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// Política de seguridad: solo recursos y conexiones del propio origen.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' blob: data:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ')

// Solo en el build: el servidor de desarrollo de Vite necesita scripts en línea.
function csp(): Plugin {
  return {
    name: 'protege-dni-csp',
    apply: 'build',
    transformIndexHtml: () => [
      { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP }, injectTo: 'head-prepend' },
    ],
  }
}

export default defineConfig({
  base: './',
  plugins: [
    react(),
    csp(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      manifest: {
        name: 'Protege DNI',
        short_name: 'Protege DNI',
        description: 'Añade una marca de agua a la copia de tu DNI y oculta datos antes de compartirla. Todo se procesa en tu dispositivo.',
        lang: 'es',
        display: 'standalone',
        start_url: './',
        scope: './',
        theme_color: '#1f3a5f',
        background_color: '#ffffff',
        icons: [
          { src: 'icono-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icono-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icono-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,mjs,css,html,svg,png,ico,webmanifest,pfb,ttf,wasm,icc}'],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes('/pdfjs/cmaps/'),
            handler: 'CacheFirst',
            options: { cacheName: 'pdfjs-cmaps' },
          },
        ],
      },
    }),
  ],
})

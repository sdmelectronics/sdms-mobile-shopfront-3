import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  build: {
    // Optimize build for production
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: mode === 'production',
        drop_debugger: mode === 'production',
        pure_funcs: mode === 'production' ? ['console.log', 'console.info', 'console.debug'] : [],
      },
      mangle: {
        toplevel: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React libraries
          'react-vendor': ['react', 'react-dom'],
          'router': ['react-router-dom'],
          
          // UI libraries - split by usage
          'ui-core': ['class-variance-authority', 'clsx', 'tailwind-merge'],
          'ui-basic': ['@radix-ui/react-slot', '@radix-ui/react-label'],
          'ui-advanced': [
            '@radix-ui/react-dialog', 
            '@radix-ui/react-dropdown-menu', 
            '@radix-ui/react-toast',
            '@radix-ui/react-tabs',
            '@radix-ui/react-select',
            '@radix-ui/react-switch',
            '@radix-ui/react-tooltip'
          ],
          
          // Data and utilities
          'supabase': ['@supabase/supabase-js'],
          'query': ['@tanstack/react-query'],
          'analytics': ['@vercel/analytics', '@vercel/speed-insights'],
          
          // Icons and animations
          'icons': ['lucide-react', '@fortawesome/fontawesome-svg-core', '@fortawesome/free-brands-svg-icons', '@fortawesome/free-solid-svg-icons', '@fortawesome/react-fontawesome'],
          'animations': ['framer-motion', 'tailwindcss-animate'],
          
          // Forms and validation
          'forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
          
          // Utilities
          'utils': ['date-fns', 'lodash.debounce', 'cmdk', 'input-otp', 'next-themes', 'react-day-picker', 'react-error-boundary', 'react-resizable-panels', 'recharts', 'sonner', 'vaul'],
        },
      },
    },
    sourcemap: mode === 'development',
    reportCompressedSize: false,
    chunkSizeWarningLimit: 1000,
    target: 'esnext', // Use modern JavaScript features
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'SDM Electronics',
        short_name: 'SDM',
        description: 'Your trusted source for quality electronics in Uganda',
        theme_color: '#1e40af',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/web-app-manifest-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/web-app-manifest-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globIgnores: ['**/node_modules/@vercel/analytics/dist/next/**'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-cache',
              // Fall back to cache quickly if the network is slow, instead of
              // hanging on a stalled request.
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 // 1 hour — API data should not be served stale for long
              },
              cacheableResponse: {
                // Only cache successful responses (drop opaque/status 0).
                statuses: [200]
              }
            }
          },
          {
            urlPattern: /\.(png|jpg|jpeg|gif|svg|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          }
        ]
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js',
      '@tanstack/react-query',
      'lucide-react',
      'framer-motion',
      'class-variance-authority',
      'clsx',
      'tailwind-merge'
    ],
    exclude: [
      // Exclude unused UI components from optimization
      '@radix-ui/react-accordion',
      '@radix-ui/react-alert-dialog',
      '@radix-ui/react-aspect-ratio',
      '@radix-ui/react-avatar',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-collapsible',
      '@radix-ui/react-context-menu',
      '@radix-ui/react-hover-card',
      '@radix-ui/react-menubar',
      '@radix-ui/react-navigation-menu',
      '@radix-ui/react-popover',
      '@radix-ui/react-progress',
      '@radix-ui/react-radio-group',
      '@radix-ui/react-scroll-area',
      '@radix-ui/react-separator',
      '@radix-ui/react-slider',
      '@radix-ui/react-toggle',
      '@radix-ui/react-toggle-group',
      '@radix-ui/react-sheet',
      '@radix-ui/react-sidebar',
      '@radix-ui/react-skeleton',
      '@radix-ui/react-calendar',
      '@radix-ui/react-carousel',
      '@radix-ui/react-command',
      '@radix-ui/react-form',
      '@radix-ui/react-resizable',
      '@radix-ui/react-table',
      '@radix-ui/react-textarea',
      '@radix-ui/react-drawer',
      '@radix-ui/react-breadcrumb',
      '@radix-ui/react-input-otp',
      '@radix-ui/react-chart',
      '@radix-ui/react-alert',
      '@radix-ui/react-sonner'
    ]
  }
}));
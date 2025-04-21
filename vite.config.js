import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { createHtmlPlugin } from 'vite-plugin-html';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [
      react({
        babel: {
          presets: [
            '@babel/preset-env',
            ['@babel/preset-react', { runtime: 'automatic' }]
          ],
          plugins: [
            '@babel/plugin-transform-runtime'
          ]
        }
      }),
      createHtmlPlugin({
        minify: mode === 'production',
        inject: {
          data: {
            title: 'Dinosaur Game Tournament',
            description: 'Chrome Dinosaur Game Tournament with cryptocurrency prizes',
          }
        }
      }),
      mode === 'analyze' && visualizer({
        open: true,
        filename: 'dist/stats.html',
        gzipSize: true,
        brotliSize: true
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@components': path.resolve(__dirname, 'src/components'),
        '@contexts': path.resolve(__dirname, 'src/contexts'),
        '@hooks': path.resolve(__dirname, 'src/hooks'),
        '@pages': path.resolve(__dirname, 'src/pages'),
        '@services': path.resolve(__dirname, 'src/services'),
        '@utils': path.resolve(__dirname, 'src/utils'),
        '@config': path.resolve(__dirname, 'src/config'),
        '@game': path.resolve(__dirname, 'src/game-integration')
      }
    },
    server: {
      port: 3000,
      open: true,
      cors: true,
      proxy: {
        '/api': {
          target: 'http://localhost:5001',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '')
        }
      }
    },
    build: {
      outDir: 'build',
      assetsDir: 'assets',
      sourcemap: mode !== 'production',
      minify: mode === 'production',
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: [
              'react', 
              'react-dom', 
              'react-router-dom'
            ],
            firebase: [
              'firebase/app', 
              'firebase/auth', 
              'firebase/firestore', 
              'firebase/functions', 
              'firebase/storage'
            ],
            mui: [
              '@mui/material', 
              '@mui/icons-material'
            ]
          }
        }
      },
      chunkSizeWarningLimit: 1000
    },
    define: {
      'process.env': {
        NODE_ENV: JSON.stringify(mode),
        FIREBASE_API_KEY: JSON.stringify(env.FIREBASE_API_KEY),
        FIREBASE_AUTH_DOMAIN: JSON.stringify(env.FIREBASE_AUTH_DOMAIN),
        FIREBASE_PROJECT_ID: JSON.stringify(env.FIREBASE_PROJECT_ID),
        FIREBASE_STORAGE_BUCKET: JSON.stringify(env.FIREBASE_STORAGE_BUCKET),
        FIREBASE_MESSAGING_SENDER_ID: JSON.stringify(env.FIREBASE_MESSAGING_SENDER_ID),
        FIREBASE_APP_ID: JSON.stringify(env.FIREBASE_APP_ID),
        USDT_BEP20_ADDRESS: JSON.stringify(env.USDT_BEP20_ADDRESS)
      }
    },
    optimizeDeps: {
      include: [
        'react', 
        'react-dom', 
        'react-router-dom',
        'firebase/app',
        'firebase/auth',
        'firebase/firestore'
      ]
    },
    assetsInclude: ['**/*.mp3', '**/*.wav', '**/*.ogg'],
    publicDir: 'public'
  };
});

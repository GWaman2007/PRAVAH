import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

// Custom Vite middleware to proxy TTS requests without browser Referer headers (ported from NotifyTest)
const ttsProxyPlugin = () => ({
  name: 'tts-proxy-plugin',
  configureServer(server: any) {
    server.middlewares.use('/api/tts', async (req: any, res: any) => {
      try {
        const parsedUrl = new URL(req.url, 'http://localhost:5173');
        const q = parsedUrl.searchParams.get('q');
        const tl = parsedUrl.searchParams.get('tl') || 'en';

        if (!q) {
          res.statusCode = 400;
          return res.end('Missing text query');
        }

        const targetUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${tl}&client=tw-ob&q=${encodeURIComponent(q)}`;
        const response = await fetch(targetUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        });

        if (!response.ok) {
          res.statusCode = response.status;
          return res.end('TTS upstream error');
        }

        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        const arrayBuffer = await response.arrayBuffer();
        res.end(Buffer.from(arrayBuffer));
      } catch (err) {
        console.error('TTS proxy error:', err);
        res.statusCode = 500;
        res.end('TTS server error');
      }
    });
  },
});

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    ttsProxyPlugin(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  optimizeDeps: {
    exclude: ['maplibre-gl'],
  },
  server: {
    port: 5173,
    host: true,
  },
});


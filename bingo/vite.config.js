import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  const customPort = process.env.npm_config_port || env.VITE_PORT || 12000;
  const customHost = process.env.npm_config_host || env.VITE_HOST || '0.0.0.0';
  const customPointer = process.env.npm_config_Pointer || env.WEB_POINTER || 'wss://chat.kevcyg.net';

  return {
    plugins: [sveltekit()],
    server: {
      host: customHost,
      port: Number(customPort),
      allowedHosts: true,
      hmr: true
    },
    resolve: {
      alias: {
        $components: '/src/components'
      }
    }
  };
});

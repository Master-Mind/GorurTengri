import { defineConfig } from "@solidjs/start/config";

export default defineConfig({
    server: {
        preset: "cloudflare-pages-static",
        rollupConfig: {
            external: ["node:async_hooks"]
        }
    },
    vite:{
        server: {
            allowedHosts: ["philtop.local"]
        }
    },
    ssr: false
});

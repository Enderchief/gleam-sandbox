import * as path from 'node:path';
import { defineConfig } from 'vite';
import gleam from 'vite-gleam';
import inspect from 'vite-plugin-inspect';
import vercel from "vite-plugin-vercel"
import { buildParserFile } from '@lezer/generator';
import UnoCss from 'unocss/vite';

/**
 * @returns {import("vite").Plugin}
 */
function lezerPlugin() {
    return {
        name: 'lezer-plugin',
        transform(code, id) {
            if (!id.endsWith('.grammar')) return;
            const res = buildParserFile(code);
            return { code: res.parser };
        },
    };
}

export default defineConfig({
    resolve: {
        alias: {
            '@assets': path.resolve(__dirname, './assets'),
        },
    },
    build: {
        sourcemap: true,
        rollupOptions: {
            input: {
                main: path.resolve(__dirname, 'index.html'),
                embed: path.resolve(__dirname, 'embed/index.html')
            },
        },
    },
    plugins: [gleam(), lezerPlugin(), UnoCss(), inspect(), vercel()]
});

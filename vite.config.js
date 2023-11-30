import * as path from 'node:path';
import { defineConfig } from 'vite';
import gleam from 'vite-gleam';
import inspect from 'vite-plugin-inspect';
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
        target: ["chrome90", "firefox90", "safari17.0"],
        sourcemap: true,
    },
    worker: {
        format: "es",
    },
    plugins: [gleam(), lezerPlugin(), UnoCss(), inspect()]
});

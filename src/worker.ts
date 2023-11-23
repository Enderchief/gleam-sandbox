import init, { compile } from './compiler/gleam_wasm.js';
// @ts-ignore
import wasmURL from 'esbuild-wasm/esbuild.wasm?url';
import { build, initialize, type Plugin } from 'esbuild-wasm';
import { compileRequest, compilerResponse, request } from './schema.js';
import { parse } from 'smol-toml';

await init();
await initialize({ wasmURL });

declare function postMessage(message: Zod.infer<typeof compilerResponse>): void;

/** @see "node:path".join */
export function join(...paths: string[]): string {
  const u = new URL(`file:${paths.join('/')}`);
  return u.pathname;
}

export function virtual(files: Record<string, string>) {
  return {
    name: 'playground-virtual-filesystem',
    setup(build) {
      build.onResolve({ filter: /.*/ }, async (args) => {
        console.log(args);
        if (args.path.startsWith('https://') || args.path.startsWith('http://'))
          return { path: args.path, namespace: 'cdn-import' };

        if (args.kind === 'entry-point')
          return { path: args.path, namespace: 'gleam' };
        if (args.kind === 'import-statement') {
          return {
            path: join(args.importer, '..', args.path),
            namespace: 'gleam',
          };
        }
        if (args.kind === 'url-token') return { path: args.path };
        return {
          path: '/' + args.path.replace(/^\.\//, ''),
          namespace: 'gleam',
        };
      });

      build.onLoad({ filter: /.*/, namespace: 'gleam' }, (args) => {
        return { contents: files[args.path], loader: 'default' };
      });

      build.onLoad({ filter: /.*/, namespace: 'cdn-import' }, async (args) => {
        return {
          contents: new Uint8Array(
            await (await fetch(args.path)).arrayBuffer()
          ),
          loader: 'default',
        };
      });
    },
  } satisfies Plugin;
}

onmessage = async (ev) => {
  console.log('[worker]', ev.data);

  if (!ev.data)
    return postMessage({
      type: 'compile',
      result: { error: 'no data supplied' },
    });

  const body = await request.safeParseAsync(ev.data);

  // @ts-ignore
  if (!body.success) return postMessage({ error: body.error });

  const data = body.data;

  if (data.type == 'compile') {
    const rawToml = data.files['/gleam.toml'];
    if (!rawToml)
      return postMessage({
        type: 'compile',
        result: { error: 'gleam.toml not supplied' },
      });
    console.log('[raw toml]', rawToml);

    const parsed = parse(rawToml);
    console.log('[parsed]', parsed);

    const res = await fetch('/api/hex', {
      body: JSON.stringify(parsed.dependencies),
      headers: { 'content-type': 'application/json' },
      method: 'post',
    });

    console.log(res.ok);

    if (!res.ok)
      return postMessage({
        type: 'compile',
        result: { error: await res.text() },
      });

    const deps = await res.json();
    // console.log('[deps]', deps);

    const files = Object.assign(data.files, deps);
    console.log('[files]\n', files);

    const { Ok, Err } = compile({
      dependencies: Object.keys(parsed.dependencies || {}),
      mode: 'Dev',
      sourceFiles: files,
      target: 'javascript',
    });

    if (Err) return postMessage({ type: 'compile', result: { error: Err } });

    const entries = [...Ok.entries(), ...Object.entries(data.files!)].map(
      ([name, content]) => [
        name
          .replace(
            /\/build\/packages\/([\w\d_\-.]+)\/src\/([\w\d_\-.]+)\.mjs/,
            '/build/dev/javascript/$1/$2.mjs'
          )
          .replace(/\/src\/(.+)/, '/build/dev/javascript/gleam-wasm/$1'),
        content,
      ]
    );

    return postMessage({
      type: 'compile',
      result: { ok: Object.fromEntries(entries) },
    });
  } else if (data.type === 'bundle') {
    console.log('[bundle]');

    const res = await build({
      entryPoints: ['/build/dev/javascript/gleam-wasm/main.mjs'],
      plugins: [virtual(data.files!)],
      bundle: true,
      format: 'esm',
      target: 'es2022',
    });
    const td = new TextDecoder('utf-8');
    const content = td.decode(res.outputFiles![0]!.contents);
    return postMessage({ type: 'bundle', result: content });
  }
};

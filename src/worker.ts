import init, { compile } from "./compiler/gleam_wasm.js";
// @ts-ignore
import wasmURL from "esbuild-wasm/esbuild.wasm?url";
import { build, initialize, type Plugin } from "esbuild-wasm";
import {
  compileRequest,
  compilerResponse,
  request as requestSchema,
} from "./schema.js";
import { parse } from "smol-toml";

await init();
await initialize({ wasmURL });

declare function postMessage(message: Zod.infer<typeof compilerResponse>): void;

/** @see "node:path".join */
export function join(...paths: string[]): string {
  const u = new URL(`file:${paths.join("/")}`);
  return u.pathname;
}

export function virtual(files: Record<string, string>) {
  return {
    name: "playground-virtual-filesystem",
    setup(build) {
      build.onResolve({ filter: /.*/ }, async (args) => {
        if (args.path.startsWith("https://") || args.path.startsWith("http://"))
          return { path: args.path, namespace: "cdn-import" };

        if (args.kind === "entry-point")
          return { path: args.path, namespace: "gleam" };
        if (args.kind === "import-statement") {
          return {
            path: join(args.importer, "..", args.path),
            namespace: "gleam",
          };
        }
        if (args.kind === "url-token") return { path: args.path };
        return {
          path: "/" + args.path.replace(/^\.\//, ""),
          namespace: "gleam",
        };
      });

      build.onLoad({ filter: /.*/, namespace: "gleam" }, (args) => {
        return { contents: files[args.path], loader: "default" };
      });

      build.onLoad({ filter: /.*/, namespace: "cdn-import" }, async (args) => {
        return {
          contents: new Uint8Array(
            await (await fetch(args.path)).arrayBuffer()
          ),
          loader: "default",
        };
      });
    },
  } satisfies Plugin;
}

interface Package {
  tag: string;
  content: Blob;
}

const databaseOpenRequest = indexedDB.open("sandbox-deps", 1);
let db: IDBDatabase;

databaseOpenRequest.onerror = (event) => {
  console.error("[db] error: ", event);
  console.log(event.toString());
};
// @ts-ignore
databaseOpenRequest.onsuccess = (event: {
  target: { result: IDBDatabase };
}) => {
  console.log("[req | success] ");

  db = event.target.result;
};
databaseOpenRequest.onupgradeneeded = (event: IDBVersionChangeEvent) => {
  console.log("[req | upgrade] ", event);

  db = databaseOpenRequest.result;
  const objectStore = db.createObjectStore("deps", { keyPath: "tag" });
  objectStore.createIndex("content", "content", { unique: false });

  objectStore.transaction.oncomplete = (ev) => {};
  objectStore.transaction.onerror = (ev) => {
    console.error("[store | trans | err]", ev);
  };
};

onmessage = async (ev) => {
  console.log("[worker]", ev.data);

  if (!ev.data)
    return postMessage({
      type: "compile",
      result: { error: "no data supplied" },
    });

  const body = await requestSchema.safeParseAsync(ev.data);

  // @ts-ignore
  if (!body.success) return postMessage({ error: body.error });

  const data = body.data;

  if (data.type == "compile") {
    return await message_compile(data);
  } else if (data.type === "bundle") {
    console.log("[bundle]");

    const res = await build({
      entryPoints: ["/build/dev/javascript/gleam-wasm/main.mjs"],
      plugins: [virtual(data.files!)],
      bundle: true,
      format: "esm",
      target: "es2022",
    });
    const td = new TextDecoder("utf-8");
    const content = td.decode(res.outputFiles![0]!.contents);
    return postMessage({ type: "bundle", result: content });
  }
};

async function message_compile(data: Zod.infer<typeof compileRequest>) {
  const rawToml = data.files["/gleam.toml"];
  if (!rawToml)
    return postMessage({
      type: "compile",
      result: { error: "gleam.toml not supplied" },
    });

  const parsed = parse(rawToml) as { dependencies: Record<string, string> };

  const store1 = db.transaction(["deps"], "readwrite").objectStore("deps");

  const promised = (
    await Promise.all(
      Object.entries(parsed.dependencies).map(async ([name, version]) => {
        const pkg = await store_get<Package>(store1, `${name}@${version}`)
        if (!pkg) return;

        const content = JSON.parse(await pkg.content.text());
        return [pkg.tag, content] as const;
      })
    )
  ).filter((v) => typeof v === "object");
  console.log(promised);

  const filetree: Record<string, Record<string, string>> = Object.fromEntries(
    promised
  );

  const all_dependency_names = Object.keys(parsed.dependencies);

  for (const key of Object.keys(filetree)) {
    const [name, _] = key.split("@");
    if (parsed.dependencies[name]) delete parsed.dependencies[name];
  }

  if (Object.keys(parsed.dependencies).length) {
    const res = await fetch("/api/hex", {
      body: JSON.stringify(parsed.dependencies),
      headers: { "content-type": "application/json" },
      method: "post",
    });

    if (!res.ok)
      return postMessage({
        type: "compile",
        result: { error: await res.text() },
      });

    const deps = (await res.json()) as Record<string, Record<string, string>>;
    Object.assign(filetree, deps);
  }

  const store2 = db.transaction(["deps"], "readwrite").objectStore("deps");
  Object.keys(filetree).map((key) => {
    const stringed = JSON.stringify(filetree[key]);
    const blob = new Blob([stringed]);
    const obj = { tag: key, content: blob } satisfies Package;
    store2.put(obj);
  });

  const deps_files = Object.values(filetree);

  const files = Object.assign(data.files, ...deps_files);

  const { Ok, Err } = compile({
    dependencies: all_dependency_names,
    mode: "Dev",
    sourceFiles: files,
    target: "javascript",
  });

  if (Err) return postMessage({ type: "compile", result: { error: Err } });

  const entries = [...Ok.entries(), ...Object.entries(data.files!)].map(
    ([name, content]) => [
      name
        .replace(
          /\/build\/packages\/([\w\d_\-.]+)\/src\/([\w\d_\-.]+)\.mjs/,
          "/build/dev/javascript/$1/$2.mjs"
        )
        .replace(/\/src\/(.+)/, "/build/dev/javascript/gleam-wasm/$1"),
      content,
    ]
  );

  return postMessage({
    type: "compile",
    result: { ok: Object.fromEntries(entries) },
  });
}

function store_get<Shape>(
  store: IDBObjectStore,
  query: Parameters<IDBObjectStore["get"]>[0]
): Promise<Shape> {
  return new Promise<Shape>((resolve, reject) => {
    const req = store.get(query);
    req.onsuccess = () => resolve(req.result);
    req.onerror = (ev) => reject(ev);
  });
}

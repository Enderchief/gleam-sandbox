import "@assets/main.css";
import "virtual:uno.css";
// @ts-expect-error: valid import
import CompileWorker from "./worker.js?worker";
import { view } from "./ffi.js";
import { compileRequest, compilerResponse } from "./schema.js";
import { main, Model$, Msg$ } from "./app.gleam";
import { element } from "hex:/lustre/lustre/element.mjs";
import { find } from "hex:/gleam_stdlib/gleam/list.mjs";
import type { Element as E } from "hex:/lustre/lustre/element.mjs";
import { EditorState } from "@codemirror/state";
import { createDocument } from "./viewer.js";

let DID_FIRST_MOUNT = false;

// @ts-expect-error: works fine
const Element = element().constructor as typeof E;

const compiler: Worker = new CompileWorker();

let compiling = false;

compiler.addEventListener("message", (ev) => {
  const _parsed = compilerResponse.safeParse(ev.data);
  if (!_parsed.success) return;

  const data = _parsed.data;


  if (data.type === "bundle") {
    createDocument(data.result);
    compiling = false;
  }
});

function compile(msg: Msg$, state: Model$) {
  if (compiling) return state;
  compiling = true;
  const jsified = Object.fromEntries(
    state.files.toArray().map((v) => {
      return [
        v.path,
        state.current === v.path
          ? view.state.doc.toString()
          : (<EditorState>v.editor).doc.toString(),
      ] as const;
    }),
  );
  console.log(jsified);
  console.log(jsified[state.current]);
  console.log(view.state.doc.toString());

  const body = {
    type: "compile",
    dependencies: {},
    files: jsified,
    target: "javascript",
  } satisfies Zod.infer<typeof compileRequest>;
  compiler.postMessage(body);

  return state;
}

main((elem, value) => {
  if (!DID_FIRST_MOUNT) {
    const found = find(value.files, (v) => v.path === value.current);
    view.setState(found[0].editor);
    DID_FIRST_MOUNT = true;
  }
  if (elem instanceof Element) {
    const mount_point = find(elem[1], (v) => v[0] === "id")[0];

    // WARNING: BREAKS WITHOUT THE TIMEOUT
    setTimeout(() => {
      const element = document.getElementById(mount_point[1]);
      element.append(view.dom);
    }, 1);
  }
  return elem;
}, compile);

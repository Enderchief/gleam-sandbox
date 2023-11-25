import "@assets/main.css";
import "virtual:uno.css";
// @ts-ignore: valid import
import CompileWorker from "./worker.js?worker";
import { view } from "./ffi.js";
import { compileRequest, compilerResponse } from "./schema.js";
import { main, Model$, Msg$, Run } from "./app.gleam";
import { element } from "hex:/lustre/lustre/element.mjs";
import { find } from "hex:/gleam_stdlib/gleam/list.mjs";
import type { Element as E } from "hex:/lustre/lustre/element.mjs";
import { EditorState } from "@codemirror/state";
import { createDocument } from "./viewer.js";

let DID_FIRST_MOUNT = false;

// @ts-expect-error
const Element = element().constructor as typeof E;

const compiler: Worker = new CompileWorker();

compiler.addEventListener("message", (ev) => {
  const _parsed = compilerResponse.safeParse(ev.data);
  if (!_parsed.success) return;

  const data = _parsed.data;

  if (data.type === "compile" && (<any>data.result).ok) {
    compiler.postMessage({ type: "bundle", files: (<any>data.result).ok });
  } else if (data.type === "bundle") {
    const outarea = document.querySelector<HTMLDivElement>("#output");
    outarea.replaceChildren(createDocument(data.result));
  }
});

function emit(msg: Msg$, state: Model$) {
  if (msg instanceof Run) {
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

    const body = {
      type: "compile",
      dependencies: {},
      files: jsified,
      target: "javascript",
    } satisfies Zod.infer<typeof compileRequest>;
    compiler.postMessage(body);

    return state;
  }

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
}, emit);

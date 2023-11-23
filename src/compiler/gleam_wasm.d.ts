/* tslint:disable */
/* eslint-disable */
/**
* Should be called once to setup any state that persists across compilation
* cycles.
* @param {boolean} debug
*/
export function init(debug: boolean): void;
/**
* @param {any} options
* @returns {any}
*/
export function compile(
  options: CompileOptions
):
  | { Ok: Map<string, string>; Err?: undefined }
  | { Ok: undefined; Err: string };

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly init: (a: number) => void;
  readonly compile: (a: number) => number;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
  readonly __wbindgen_exn_store: (a: number) => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {SyncInitInput} module
*
* @returns {InitOutput}
*/
export function initSync(module: SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {InitInput | Promise<InitInput>} module_or_path
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: InitInput | Promise<InitInput>): Promise<InitOutput>;

export const target = {
  JavaScript: 'javascript',
  Erlang: 'erlang',
} as const;

export type Target = (typeof target)[keyof typeof target];

export const mode = {
  Dev: 'Dev',
  Prod: 'Prod',
  Lsp: 'Lsp',
} as const;

export type Mode = (typeof mode)[keyof typeof mode];

export interface CompileOptions {
  /** The platform language  */
  target: Target;
  /** Mapping of a file path relative to `/` to its content */
  sourceFiles: Record<string, string>;
  /** List of dependencies.
   * *Note*: These are **not** fetched from hex, the dependency files need to be supplied in sourceFiles.
   */
  dependencies: string[];
  /**
   * Output mode
   */
  mode: Mode;
}

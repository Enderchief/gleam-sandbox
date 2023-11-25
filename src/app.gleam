// @unocss-include
import gleam/bool
import gleam/dynamic
import gleam/list.{filter, find, map}
import gleam/result
import gleam/string
import lustre
import lustre/attribute.{class, classes, id}
import lustre/element/html.{button, div, iframe, input, li, span, ul}
import lustre/element.{type Element, text}
import lustre/event

pub type Editor

pub type View

@external(javascript, "./ffi.ts", "createEditor")
fn create_editor(path: String, value: String, language: String) -> File

@external(javascript, "./ffi.ts", "getView")
fn get_view() -> View

@external(javascript, "./ffi.ts", "getState")
fn get_state(view: View) -> Editor

@external(javascript, "./ffi.ts", "setState")
fn set_state(view: View, state: Editor) -> Nil

fn get_language(path: String) {
  let assert Ok(ending) =
    string.split(path, on: ".")
    |> list.last

  case ending {
    "mjs" | "js" | "ts" -> "javascript"
    _ -> ending
  }
}

pub type File {
  File(path: String, editor: Editor)
}

pub fn main(
  editor: fn(Element(Msg), Model) -> Element(Msg),
  emit: fn(Msg, Model) -> Model,
) {
  let app = lustre.simple(init, update(emit), render(editor, _))
  let assert Ok(dispatch) = lustre.start(app, "div", Nil)
  dispatch
}

fn example_basic() {
  Model(
    current: "/src/app.gleam",
    files: [
      create_editor(
        "/src/app.gleam",
        "pub type Element\n\n@external(javascript, \"./ffi_dom.mjs\", \"select\")\npub fn select(selector: String) -> Element\n
@external(javascript, \"./ffi_dom.mjs\", \"update\")\npub fn update(element: Element, updater: fn(String) -> a) -> Nil\n
\npub fn main() {\n  let app = select(\"#app\")\n  |> update(fn (v) { \"Hello World\" })\n}\n",
        "gleam",
      ),
      create_editor(
        "/gleam.toml",
        "# gleam.toml is only used for dependencies\n\n# version have to be exact (no 'foo = \"~> 0.1.3\"')\n[dependencies]\ngleam_stdlib = \"0.31.0\"",
        "toml",
      ),
      create_editor(
        "/src/ffi_dom.mjs",
        "export function select(selector) {\n  return document.querySelector(selector);\n}\n
export function update(element, updater) {\n  element.innerText = updater(element.innerText);\n}\n",
        "javascript",
      ),
      create_editor(
        "/src/main.mjs",
        "import { main } from \"./app.mjs\";\nmain();\n",
        "javascript",
      ),
    ],
  )
}

fn example_lustre() {
  Model(
    current: "/src/app.gleam",
    files: [
      create_editor(
        "/src/app.gleam",
        "import lustre\nimport lustre/element.{text}\n\npub fn main() {
  let app = lustre.element(text(\"Hello from Lustre!\"))\n  let assert Ok(_) = lustre.start(app, \"#app\", Nil)\n
  Nil\n}",
        "gleam",
      ),
      create_editor(
        "/src/main.mjs",
        "// Note: main.mjs is the entry file imported by index.html\nimport { main } from \"./app.mjs\";\n\ndocument.addEventListener(\"DOMContentLoaded\", () => {
  main();\n})",
        "javascript",
      ),
      create_editor(
        "/gleam.toml",
        "# gleam.toml is only used for dependencies\n\n# version have to be exact (no 'foo = \"~> 0.1.3\"')
[dependencies]\ngleam_stdlib = \"0.31.0\"\nlustre = \"3.0.11\"
",
        "toml",
      ),
    ],
  )
}

fn init(_) {
  example_basic()
  example_lustre()
}

pub type Model {
  Model(current: String, files: List(File))
}

pub type Msg {
  Delete(path: String)
  ChangeFile(path: String)
  New(path: String)
  Run
  Compiled(String)
}

fn update(emit: fn(Msg, Model) -> Model) {
  fn(state: Model, msg: Msg) -> Model {
    let new = case msg {
      Delete(path) ->
        Model(
          state.current,
          filter(state.files, fn(file) { file.path != path }),
        )
      ChangeFile(path) -> {
        let view = get_view()
        let new_state =
          bool.guard(
            when: path == state.current,
            return: state,
            otherwise: fn() {
              Model(
                path,
                map(
                  state.files,
                  fn(file) {
                    case file.path == state.current {
                      True -> File(file.path, get_state(view))
                      False -> file
                    }
                  },
                ),
              )
            },
          )

        case find(state.files, fn(file) { file.path == path }) {
          Ok(new_view) -> set_state(view, new_view.editor)
          Error(_) -> {
            let assert Ok(first_view) = list.first(state.files)
            set_state(view, first_view.editor)
          }
        }

        new_state
      }
      New(path) ->
        case string.is_empty(path) {
          True -> state
          False ->
            case list.find(state.files, fn(file) { file.path == path }) {
              Ok(_) -> state
              Error(_) ->
                Model(
                  state.current,
                  list.append(
                    state.files,
                    [create_editor(path, "// edit me", get_language(path))],
                  ),
                )
            }
        }

      _ -> state
    }
    emit(msg, new)
  }
}

fn file_tree(state: Model) -> Element(Msg) {
  div(
    [class("font-[FiraCode] c-white bg-[#1e1e1e]")],
    [
      div(
        [class("flex justify-around")],
        [
          button(
            [
              class(
                "c-white b-none font-[FiraCode] bg-transparent text-size-6 cursor-pointer",
              ),
              event.on(
                "click",
                fn(event) {
                  event
                  |> dynamic.field(
                    "target",
                    dynamic.field(
                      "nextSibling",
                      dynamic.field("value", dynamic.string),
                    ),
                  )
                  |> result.map(New)
                },
              ),
            ],
            [text("")],
          ),
          input([
            class("c-white bg-dark-8 b-[#1e1e1e] w-40"),
            attribute.placeholder("/path/to/file"),
          ]),
        ],
      ),
      ul(
        [class("list-none px-0 py-2 m-0")],
        map(
          state.files,
          fn(file) -> Element(Msg) {
            li(
              [
                class(
                  "b-1 px-1 py-1 m-0 w-48 hover:bg-dark text-size-3 cursor-pointer first-children:hover:opacity-100",
                ),
                classes([#("bg-dark-8", file.path == state.current)]),
                event.on_click(ChangeFile(file.path)),
              ],
              [
                span(
                  [
                    class("px-2 text-size-4 font-[FiraCode] c-red-5 opacity-0"),
                    event.on_click(Delete(file.path)),
                  ],
                  [text("")],
                ),
                text(file.path),
              ],
            )
          },
        ),
      ),
    ],
  )
}

fn render(editor: fn(Element(Msg), Model) -> Element(Msg), state: Model) {
  div(
    [id("app")],
    [
      div(
        [class("flex flex-row h-2xl bg-[#1e1e1e]")],
        [
          file_tree(state),
          editor(
            div([class("h-2xl children:h-full min-w-5xl"), id("editor")], []),
            state,
          ),
        ],
      ),
      div(
        [class("b-1 b-gray-3 b-solid h-90 p-2 flex"), id("output")],
        [
          iframe([
            class("m-0 p-0 grow b-none"),
            attribute.attribute(
              "srcdoc",
              "<pre style='font-size: 1rem'>not built yet</pre>",
            ),
          ]),
        ],
      ),
      button(
        [
          class(
            "outline-none text-size-base rd-1 b-0 b-solid px6 py1 cursor-pointer",
          ),
          event.on_click(Run),
        ],
        [text("Run")],
      ),
    ],
  )
}

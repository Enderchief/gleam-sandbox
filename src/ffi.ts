import {
  lineNumbers,
  highlightActiveLineGutter,
  highlightSpecialChars,
  drawSelection,
  dropCursor,
  rectangularSelection,
  crosshairCursor,
  highlightActiveLine,
  keymap,
  EditorView,
} from "@codemirror/view";
export { EditorView } from "@codemirror/view";
import {
  foldGutter,
  indentOnInput,
  bracketMatching,
  foldKeymap,
} from "@codemirror/language";
import { history, defaultKeymap, historyKeymap } from "@codemirror/commands";
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search";
import {
  closeBrackets,
  autocompletion,
  closeBracketsKeymap,
  completionKeymap,
} from "@codemirror/autocomplete";
import { lintKeymap } from "@codemirror/lint";

import { EditorState, Extension } from "@codemirror/state";
import { theme, highlightStyle, gleam } from "./editor/extensions.js";
import { html } from "@codemirror/lang-html";
import { javascript } from "@codemirror/lang-javascript";
import { File } from "./app.gleam";

export const view = new EditorView();
export const lang_map = { gleam, javascript, html } as const;

function getLanguage(language: keyof typeof lang_map) {
  return lang_map[language];
}

export function createEditor(
  path: string,
  value: string,
  language: keyof typeof lang_map,
) {
  const extensions = [
    lineNumbers(),
    highlightActiveLineGutter(),
    highlightSpecialChars(),
    history(),
    foldGutter(),
    drawSelection(),
    dropCursor(),
    EditorState.allowMultipleSelections.of(true),
    indentOnInput(),
    bracketMatching(),
    closeBrackets(),
    autocompletion(),
    rectangularSelection(),
    crosshairCursor(),
    highlightActiveLine(),
    highlightSelectionMatches(),
    theme,
    highlightStyle,
    keymap.of([
      ...closeBracketsKeymap,
      ...defaultKeymap,
      ...searchKeymap,
      ...historyKeymap,
      ...foldKeymap,
      ...completionKeymap,
      ...lintKeymap,
    ]),
  ] satisfies Extension[];
  const lang = getLanguage(language);
  if (lang) extensions.push(lang());
  return new File(
    path,
    EditorState.create({
      doc: value,
      extensions,
    }),
  );
}

export function getView() {
  return view;
}

export function setState(view: EditorView, state: EditorState) {
  view.setState(state);
  return null;
}

export function getState(view: EditorView) {
  return view.state;
}

export function getValue(view: EditorView) {
  return view.state.doc.toString();
}

import { EditorView } from '@codemirror/view';
import {
  HighlightStyle,
  LRLanguage,
  syntaxHighlighting,
} from '@codemirror/language';
import { styleTags, tags as t } from '@lezer/highlight';
import { completeFromList } from '@codemirror/autocomplete';
import { LanguageSupport } from '@codemirror/language';
import { parser } from './gleam.grammar';

const c = {
  bg: '#1e1e1e',
  fg: '#a3a2a2',
  cursor: 'white',
};

export const theme = EditorView.theme(
  {
    '&': {
      color: c.fg,
      backgroundColor: c.bg,
    },
    '.cm-content': {
      caretColor: c.cursor,
      fontFamily: 'Fira Code',
      fontSize: '0.9rem',
      minHeight: '400px',
    },
    '.cm-cursor, .cm-dropCursor': {
      borderLeftColor: c.cursor,
    },
    '.cm-panels': { backgroundColor: c.bg, color: c.fg },
    '.cm-panels.cm-panels-top': { borderBottom: '2px solid black' },
    '.cm-panels.cm-panels-bottom': { borderTop: '2px solid black' },
    '.cm-scroller': { overflow: 'auto' },
    '.cm-gutter': { minHeight: '400px' },
    '.cm-gutters': {backgroundColor: c.bg}
  },
  { dark: true }
);
export const highlightStyle = syntaxHighlighting(
  HighlightStyle.define(
    [
      { tag: [t.comment], color: '#808080' },
      { tag: t.string, color: '#c8ffa7' },
      { tag: t.name, color: '#FFFFFFD9' },
      {
        tag: [t.typeName, t.constant(t.variableName), t.self],
        // color: '#FE7AB2',
        color: '#ffddfa',
      },
      { tag: [t.className, t.heading], color: '#FFDDFA' },
      {
        tag: [
          t.function(t.variableName),
          t.definition(t.variableName),
          t.function(t.propertyName),
        ],
        color: '#9CE7FF',
      },
      { tag: t.quote, color: '#D9BAFF' },
      { tag: [t.annotation, t.namespace, t.bool], color: '#ffddfa' },
      { tag: t.definitionOperator, color: '#ffaff3D9' },
      { tag: [t.definitionKeyword, t.keyword], color: '#FFD596' },
      { tag: t.number, color: '#fdffab' },
      {
        tag: [
          t.operator,
          t.operatorKeyword,
          t.regexp,
          t.logicOperator,
          t.derefOperator,
          t.typeOperator,
          t.updateOperator,
          t.bitwiseOperator,
          t.compareOperator,
          t.controlOperator,
        ],
        color: '#ffaff3D9',
      },
      { tag: [t.angleBracket, t.brace, t.paren], color: '#FFFFFFD9' },
      { tag: t.character, color: 'white' },
    ],
    { themeType: 'dark' }
  )
);

export const gleamLrLanguage = LRLanguage.define({
  parser: parser.configure({
    props: [
      styleTags({
        'const let type fn': t.definitionKeyword,
        import: t.moduleKeyword,
        pub: t.modifier,
        match: t.controlKeyword,
        'as in': t.operatorKeyword,
        String: t.string,
        Bool: t.bool,
        '( )': t.paren,
        '{ }': t.brace,
        Comment: t.comment,
        'Number Decimal Hex Octal Binary Float': t.number,
        LowercaseIdentifier: t.variableName,
        UppercaseIdentifier: t.typeName,
        Keyword: t.keyword,
      }),
    ],
  }),
  languageData: {
    closeBrackets: { brackets: ['(', '[', '{', '"'] },
    commentTokens: { line: '//' },
  },
});

export const gleamCompletion = gleamLrLanguage.data.of({
  autocomplete: completeFromList([
    { label: 'fn', type: 'keyword' },
    { label: 'let', type: 'keyword' },
    { label: 'const', type: 'keyword' },
    { label: 'type', type: 'keyword' },
    { label: 'pub', type: 'keyword' },
    { label: 'import', type: 'keyword' },
  ]),
});

export function gleam() {
  return new LanguageSupport(gleamLrLanguage, gleamCompletion);
}

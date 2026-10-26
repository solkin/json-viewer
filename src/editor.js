import {
  EditorState,
  Compartment,
  StateEffect,
  StateField,
} from "@codemirror/state";
import {
  EditorView,
  Decoration,
  keymap,
  lineNumbers,
  highlightActiveLine,
  placeholder,
  drawSelection,
} from "@codemirror/view";
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
import {
  syntaxHighlighting,
  HighlightStyle,
  bracketMatching,
  foldGutter,
  foldKeymap,
  StreamLanguage,
} from "@codemirror/language";
import { json } from "@codemirror/lang-json";
import { yaml } from "@codemirror/legacy-modes/mode/yaml";
import { tags } from "@lezer/highlight";

const errorEffect = StateEffect.define();
const errorLines = StateField.define({
  create: () => Decoration.none,
  update(value, tr) {
    value = value.map(tr.changes);
    for (const effect of tr.effects)
      if (effect.is(errorEffect)) {
        const line = effect.value;
        value =
          line && line <= tr.state.doc.lines
            ? Decoration.set([
                Decoration.line({ class: "cm-error-line" }).range(
                  tr.state.doc.line(line).from,
                ),
              ])
            : Decoration.none;
      }
    return value;
  },
  provide: (field) => EditorView.decorations.from(field),
});
const colors = HighlightStyle.define([
  { tag: tags.propertyName, color: "var(--syntax-key)" },
  { tag: tags.string, color: "var(--syntax-string)" },
  { tag: tags.number, color: "var(--syntax-number)" },
  { tag: tags.bool, color: "var(--syntax-boolean)" },
  { tag: tags.null, color: "var(--syntax-null)" },
  { tag: tags.bracket, color: "var(--syntax-bracket)" },
  { tag: tags.comment, color: "var(--syntax-comment)" },
]);
export class DocumentEditor extends EventTarget {
  constructor(textarea) {
    super();
    this.container = textarea.closest(".editor-container");
    const host = this.container.querySelector(".editor-scroll-container");
    this.wrap = new Compartment();
    this.hint = new Compartment();
    this.cachedValue = null;
    const state = EditorState.create({
      doc: textarea.value,
      extensions: [
        textarea.id === "yaml-yaml-editor"
          ? StreamLanguage.define(yaml)
          : json(),
        errorLines,
        lineNumbers(),
        foldGutter(),
        bracketMatching(),
        history(),
        drawSelection(),
        highlightActiveLine(),
        keymap.of([
          indentWithTab,
          ...defaultKeymap,
          ...historyKeymap,
          ...foldKeymap,
        ]),
        syntaxHighlighting(colors),
        this.wrap.of([]),
        this.hint.of(placeholder(textarea.placeholder)),
        EditorView.contentAttributes.of({
          "aria-label": textarea.id.replaceAll("-", " "),
          spellcheck: "false",
        }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            this.cachedValue = null;
            if (!this.settingValue) this.dispatchEvent(new Event("input"));
          }
          if (update.selectionSet || update.docChanged)
            this.dispatchEvent(new Event("cursor"));
        }),
      ],
    });
    host.replaceChildren();
    host.classList.add("cm-host");
    this.container.querySelector(".line-numbers").hidden = true;
    this.view = new EditorView({ state, parent: host });
  }
  get value() {
    return (this.cachedValue ??= this.view.state.doc.toString());
  }
  set value(text) {
    if (this.value === text) return;
    this.settingValue = true;
    try {
      this.view.dispatch({
        changes: { from: 0, to: this.view.state.doc.length, insert: text },
      });
    } finally {
      this.settingValue = false;
    }
  }
  get selectionStart() {
    return this.view.state.selection.main.from;
  }
  get lineCount() {
    return this.view.state.doc.lines;
  }
  get cursor() {
    const pos = this.view.state.selection.main.head,
      line = this.view.state.doc.lineAt(pos);
    return { line: line.number, column: pos - line.from + 1 };
  }
  set placeholder(text) {
    this.view.dispatch({ effects: this.hint.reconfigure(placeholder(text)) });
  }
  setError(line) {
    this.view.dispatch({ effects: errorEffect.of(line) });
  }
  setWrapped(on) {
    this.view.dispatch({
      effects: this.wrap.reconfigure(on ? EditorView.lineWrapping : []),
    });
  }
  focus() {
    this.view.focus();
  }
}

import { ai } from "../api/client";
import { t } from "../i18n/hr";
import { entryCard, sheet, withAi } from "./components";
import { append, h } from "./dom";

/**
 * The floating translation bubble, available on every screen.
 * Type or select a word, get a quick everyday translation and save it.
 */
export function translationBubble(): HTMLElement {
  let selected = "";
  const button = h(
    "button",
    {
      class: "bubble",
      type: "button",
      "aria-label": t.bubble,
      // Read the selection before the tap clears it.
      onPointerdown: () => {
        selected = window.getSelection()?.toString().trim() ?? "";
      },
      onClick: () => open(selected),
    },
    "⇄",
  );
  return button;
}

export function open(initial = ""): void {
  const { body } = sheet(t.bubble);
  const input = h("textarea", {
    class: "input",
    rows: 2,
    placeholder: t.translate.placeholder,
    "aria-label": t.translate.placeholder,
    value: initial,
  });
  const result = h("div", { class: "bubble-result" });
  const go = async () => {
    const text = input.value.trim();
    if (!text) return;
    const out = await withAi(result, () => ai("translate", { text, context: null }));
    if (!out) return;
    append(result, [
      h("p", { class: "translation", lang: "en" }, out.translation),
      out.entries.map((e) => entryCard(e, "translation")),
    ]);
  };
  body.append(
    h("small", { class: "hint" }, t.translate.selectionHint),
    input,
    h("button", { class: "btn primary", type: "button", onClick: go }, t.common.translate),
    result,
  );
  input.focus();
  if (initial) void go();
}

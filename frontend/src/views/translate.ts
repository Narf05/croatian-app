import { ai } from "../api/client";
import { t } from "../i18n/hr";
import { bilingual, entryCard, pageTitle, withAi } from "../ui/components";
import { h, replace } from "../ui/dom";

/** Expandable "Kako funkcionira": only calls the AI when opened. */
export function howItWorks(text: string, context: string | null = null): HTMLElement {
  const body = h("div", { class: "how-body" });
  let loaded = false;
  const details = h("details", { class: "how" }, h("summary", null, t.translate.howItWorks), body);
  details.addEventListener("toggle", async () => {
    if (!details.open || loaded) return;
    loaded = true;
    const out = await withAi(body, () => ai("explain", { text, context }));
    if (!out) {
      loaded = false;
      return;
    }
    replace(
      body,
      bilingual(out.explanation, "div"),
      out.related.length
        ? [
            h("h3", null, t.translate.related),
            h(
              "ul",
              { class: "related" },
              out.related.map((r) => h("li", null, h("b", { lang: "hr" }, r.croatian), " – ", h("span", { lang: "en" }, r.translation))),
            ),
          ]
        : null,
    );
  });
  return details;
}

export function translateView(): Node {
  const input = h("textarea", {
    class: "input",
    rows: 3,
    id: "translate-input",
    placeholder: t.translate.placeholder,
    "aria-label": t.translate.placeholder,
  });
  const result = h("div", { class: "translate-result" });
  const go = async (e: Event) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    const out = await withAi(result, () => ai("translate", { text, context: null }));
    if (!out) return;
    replace(
      result,
      h("p", { class: "translation big", "data-testid": "translation" }, out.translation),
      howItWorks(text),
      out.entries.length ? h("h2", null, t.translate.keyWords) : null,
      out.entries.map((e) => entryCard(e, "translation")),
    );
  };
  return h(
    "div",
    { class: "page" },
    pageTitle(t.nav.translate),
    h("form", { class: "card", onSubmit: go }, input, h("button", { class: "btn primary", type: "submit" }, t.common.translate)),
    result,
  );
}

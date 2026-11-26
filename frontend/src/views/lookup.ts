import { ai } from "../api/client";
import { t } from "../i18n/hr";
import type { Source } from "../types";
import { bilingual, entryCard, sheet, withAi } from "../ui/components";
import { append, h } from "../ui/dom";

/** Tapped a word in a song, text or conversation: explain it and offer to save it. */
export async function lookupWord(word: string, context: string, source: Source): Promise<void> {
  const { body } = sheet(word);
  const out = await withAi(body, () => ai("word_lookup", { word, context }));
  if (!out) return;
  body.append(entryCard(out.entry, source, bilingual(out.explanation)));
}

/** Explain a whole line or sentence ("Kako funkcionira"). */
export async function explainText(text: string, context: string | null): Promise<void> {
  const { body } = sheet(t.translate.howItWorks);
  const out = await withAi(body, () => ai("explain", { text, context }));
  if (!out) return;
  append(body, [
    h("p", { class: "quote", lang: "hr" }, text),
    bilingual(out.explanation, "div"),
    out.related.length
      ? h(
          "ul",
          { class: "related" },
          out.related.map((r) => h("li", null, h("b", { lang: "hr" }, r.croatian), " – ", h("span", { lang: "en" }, r.translation))),
        )
      : null,
  ]);
}

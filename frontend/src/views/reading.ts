import { ai } from "../api/client";
import { deleteRow, getRow, listRows, putRow } from "../db/repo";
import { t } from "../i18n/hr";
import { newId } from "../lib/id";
import { navigate, type RouteContext } from "../router";
import { confirmDelete, emptyState, pageTitle, tappableText, withAi, withEn } from "../ui/components";
import { h, replace } from "../ui/dom";
import type { ReadingText } from "../types";
import { lookupWord } from "./lookup";

/** Split a text into paragraphs of sentences. */
export function splitSentences(body: string): string[][] {
  return body
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .map((p) => p.match(/[^.!?…]+(?:[.!?…]+["“”»)]*|$)/g)?.map((s) => s.trim()).filter(Boolean) ?? [p]);
}

export async function readingListView(): Promise<Node> {
  const texts = await listRows("texts");
  const title = h("input", { class: "input", id: "text-title", autocomplete: "off" });
  const body = h("textarea", { class: "input", id: "text-body", rows: 8, lang: "hr" });
  return h(
    "div",
    { class: "page" },
    pageTitle(t.nav.reading, "#/vise"),
    h(
      "form",
      {
        class: "card",
        onSubmit: async (e: Event) => {
          e.preventDefault();
          if (!body.value.trim()) return;
          const text: ReadingText = {
            id: newId(),
            title: title.value.trim() || body.value.trim().slice(0, 40),
            body: body.value.trim(),
            createdAt: new Date().toISOString(),
            translations: {},
          };
          await putRow("texts", text);
          navigate(`/citanje/${text.id}`);
        },
      },
      h("h2", null, t.reading.newText),
      h("label", { for: "text-title" }, t.reading.title),
      title,
      h("label", { for: "text-body" }, t.reading.body),
      body,
      h("button", { class: "btn primary", type: "submit" }, t.reading.saveText),
    ),
    h("h2", null, t.reading.saved),
    texts.length
      ? h(
          "ul",
          { class: "plain-list" },
          texts.map((x) => h("li", null, h("a", { class: "card link-card", href: `#/citanje/${x.id}` }, x.title))),
        )
      : emptyState(),
  );
}

export async function readingView(ctx: RouteContext): Promise<Node> {
  const text = await getRow("texts", ctx.params.id ?? "");
  if (!text) return emptyState();
  let index = 0;
  const paragraphs = splitSentences(text.body).map((sentences) =>
    h(
      "p",
      { class: "reading-para" },
      sentences.map((sentence) => {
        const i = index++;
        const translation = h("span", { class: "sentence-en", lang: "en" }, text.translations[i] ?? "");
        const status = h("span");
        return h(
          "span",
          { class: "sentence" },
          tappableText(sentence, (w) => void lookupWord(w, sentence, "reading")),
          " ",
          h(
            "button",
            {
              class: "btn tiny",
              type: "button",
              "aria-label": t.reading.translateSentence,
              title: t.reading.translateSentence,
              onClick: async () => {
                if (text.translations[i]) return;
                const out = await withAi(status, () => ai("translate", { text: sentence, context: text.title }));
                if (!out) return;
                text.translations[i] = out.translation;
                await putRow("texts", text);
                replace(translation, out.translation);
              },
            },
            "⇄",
          ),
          status,
          translation,
          " ",
        );
      }),
    ),
  );
  return h(
    "div",
    { class: "page" },
    pageTitle(text.title, "#/citanje"),
    withEn(t.instr.tapWords),
    h("article", { class: "reading", lang: "hr" }, paragraphs),
    h(
      "button",
      {
        class: "btn danger",
        type: "button",
        onClick: async () => {
          if (!confirmDelete()) return;
          await deleteRow("texts", text.id);
          navigate("/citanje");
        },
      },
      t.common.delete,
    ),
  );
}

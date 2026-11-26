import type { Bilingual, WordEntry } from "@croatian-app/shared";
import { parseStressed } from "@croatian-app/shared/stress";
import { AiError } from "../api/client";
import { allLists, saveEntry } from "../db/repo";
import { getSettings, setSetting } from "../db/settings";
import { t } from "../i18n/hr";
import type { Source, Word } from "../types";
import { h, replace, type Child } from "./dom";

/** A word with its stressed letter highlighted. */
export function stressed(word: string, stressIndex: number | null): HTMLElement {
  const chars = [...word];
  return h(
    "span",
    { class: "word", lang: "hr" },
    chars.map((c, i) => (i === stressIndex ? h("mark", { class: "stress", title: t.common.stress }, c) : c)),
  );
}

/** Croatian text with an "EN" toggle that reveals the English version underneath. */
export function bilingual(text: Bilingual, tag: "p" | "div" = "p"): HTMLElement {
  // Text the user wrote has no English version: show it without the toggle.
  if (!text.en.trim()) return h("div", { class: "bi" }, h(tag, { class: "hr", lang: "hr" }, text.hr));
  const en = h(tag, { class: "en", lang: "en", hidden: true }, text.en);
  const toggle = h(
    "button",
    {
      class: "en-toggle",
      type: "button",
      "aria-pressed": "false",
      onClick: () => {
        en.hidden = !en.hidden;
        toggle.setAttribute("aria-pressed", String(!en.hidden));
      },
    },
    t.common.en,
  );
  return h("div", { class: "bi" }, h(tag, { class: "hr", lang: "hr" }, text.hr), toggle, en);
}

/** An instruction or warning: Croatian with a small English subtitle (always visible). */
export function withEn(text: Bilingual, cls = "instr"): HTMLElement {
  return h(
    "div",
    { class: cls },
    h("span", { lang: "hr" }, text.hr),
    h("small", { class: "en-sub", lang: "en" }, text.en),
  );
}

export function notice(text: Bilingual, kind: "warn" | "ok" = "warn"): HTMLElement {
  const el = withEn(text, `notice ${kind}`);
  el.setAttribute("role", kind === "warn" ? "alert" : "status");
  return el;
}

/** The message for an error thrown by an AI call. */
export function errorNotice(error: unknown): HTMLElement {
  const code = error instanceof AiError ? error.code : "unknown";
  if (!(error instanceof AiError)) console.error(error);
  return notice(t.aiErrors[code]);
}

export function loading(text: string = t.common.thinking): HTMLElement {
  return h("p", { class: "loading", role: "status" }, h("span", { class: "spinner" }), text);
}

/**
 * Run an AI call while showing a spinner in `target`; on error show the message there.
 * Returns the result, or undefined on error.
 */
export async function withAi<T>(target: Element, run: () => Promise<T>): Promise<T | undefined> {
  replace(target, loading());
  try {
    const result = await run();
    replace(target);
    return result;
  } catch (error) {
    replace(target, errorNotice(error));
    return undefined;
  }
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;

export function toast(message: string | Bilingual): void {
  document.querySelector(".toast")?.remove();
  const el =
    typeof message === "string"
      ? h("div", { class: "toast", role: "status" }, message)
      : h("div", { class: "toast", role: "status" }, message.hr, h("small", { class: "en-sub" }, message.en));
  document.body.append(el);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.remove(), 2500);
}

export function grammarLine(w: Pick<Word, "partOfSpeech" | "gender" | "aspect" | "aspectPair" | "caseNote">): string {
  return [
    w.partOfSpeech,
    w.gender ? t.gender[w.gender] : null,
    w.aspect ? `${w.aspect}${w.aspectPair ? ` (par: ${w.aspectPair})` : ""}` : null,
    w.caseNote,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function srBsBadge(serbianBosnian: string | null): HTMLElement | null {
  return serbianBosnian
    ? h("span", { class: "badge srbs", title: "Srpski/bosanski oblik" }, `${t.srBs}: ${serbianBosnian}`)
    : null;
}

/** A select for the target list plus a save button (one tap; remembers the last list). */
export function saveControls(entry: WordEntry, source: Source): HTMLElement {
  const select = h("select", { class: "list-select", "aria-label": t.vocab.list }, h("option", { value: "" }, t.common.noList));
  const button = h("button", { class: "btn small primary", type: "button" }, t.common.save);
  void (async () => {
    const [lists, settings] = await Promise.all([allLists(), getSettings()]);
    for (const list of lists) {
      select.append(h("option", { value: list.id, selected: list.id === settings.lastListId }, list.name));
    }
  })();
  button.addEventListener("click", async () => {
    const listId = select.value || null;
    await setSetting("lastListId", listId);
    const { created } = await saveEntry(entry, source, listId);
    button.textContent = created ? t.common.saved : listId ? t.common.savedToList : t.common.alreadySaved;
    button.disabled = true;
  });
  return h("div", { class: "save-row" }, select, button);
}

/** Card for a word returned by the AI, ready to save. */
export function entryCard(entry: WordEntry, source: Source, extra: Child = null): HTMLElement {
  const { croatian, translation } = entry;
  const parsed = parseStressed(entry.stressed);
  if (parsed.word.toLocaleLowerCase("hr") !== croatian.trim().toLocaleLowerCase("hr")) {
    parsed.word = croatian;
    parsed.stressIndex = null;
  }
  return h(
    "article",
    { class: "card entry", "data-word": croatian },
    h(
      "div",
      { class: "entry-head" },
      h("strong", { class: "entry-word" }, stressed(parsed.word, parsed.stressIndex)),
      h("span", { class: "entry-translation", lang: "en" }, translation),
      srBsBadge(entry.serbianBosnian),
    ),
    h("p", { class: "grammar" }, grammarLine(entry)),
    bilingual(entry.example),
    extra,
    saveControls(entry, source),
  );
}

/** A bottom sheet dialog. Returns the content element and a close function. */
export function sheet(title: string): { body: HTMLElement; close: () => void } {
  document.querySelector(".sheet-backdrop")?.remove();
  const body = h("div", { class: "sheet-body" });
  const close = () => backdrop.remove();
  const backdrop = h(
    "div",
    {
      class: "sheet-backdrop",
      onClick: (e: Event) => {
        if (e.target === backdrop) close();
      },
    },
    h(
      "section",
      { class: "sheet", role: "dialog", "aria-modal": "true", "aria-label": title },
      h(
        "header",
        { class: "sheet-head" },
        h("h2", null, title),
        h("button", { class: "icon-btn", type: "button", "aria-label": t.common.close, onClick: close }, "✕"),
      ),
      body,
    ),
  );
  document.body.append(backdrop);
  return { body, close };
}

/** Croatian text split into tappable words. */
export function tappableText(text: string, onWord: (word: string) => void): HTMLElement {
  const parts = text.split(/([\p{L}\p{M}'’-]+)/u);
  return h(
    "span",
    { class: "tappable", lang: "hr" },
    parts.map((part, i) =>
      i % 2 === 1
        ? h("button", { class: "tap-word", type: "button", onClick: () => onWord(part) }, part)
        : part,
    ),
  );
}

export function confirmDelete(): boolean {
  return window.confirm(`${t.warn.confirmDelete.hr}\n${t.warn.confirmDelete.en}`);
}

export function pageTitle(text: string, back?: string): HTMLElement {
  return h(
    "header",
    { class: "page-head" },
    back ? h("a", { class: "back", href: back, "aria-label": t.common.back }, "‹") : null,
    h("h1", null, text),
  );
}

export function emptyState(text: string = t.common.empty): HTMLElement {
  return h("p", { class: "empty" }, text);
}

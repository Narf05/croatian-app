import { stressableIndexes } from "@croatian-app/shared/stress";
import {
  allLists,
  allWords,
  createList,
  deleteList,
  deleteWord,
  dueWords,
  logActivity,
  putWord,
  renameList,
  setWordLists,
} from "../db/repo";
import { t } from "../i18n/hr";
import { formatDate } from "../lib/dates";
import { newId } from "../lib/id";
import { newSrs } from "../lib/srs";
import { normalize } from "../lib/study";
import type { RouteContext } from "../router";
import {
  bilingual,
  confirmDelete,
  emptyState,
  grammarLine,
  pageTitle,
  srBsBadge,
  stressed,
  toast,
} from "../ui/components";
import { h, replace } from "../ui/dom";
import type { Word, WordList } from "../types";

const TABS = [
  ["review", t.vocab.review],
  ["words", t.vocab.myWords],
  ["lists", t.vocab.lists],
  ["add", t.vocab.addWord],
] as const;

export async function vocabularyView(ctx: RouteContext): Promise<Node> {
  const tab = ctx.query.get("tab") ?? "review";
  const content =
    tab === "words" ? await wordsTab(ctx) : tab === "lists" ? await listsTab(ctx) : tab === "add" ? await addTab() : await reviewTab();
  return h(
    "div",
    { class: "page" },
    pageTitle(t.nav.vocabulary),
    h(
      "nav",
      { class: "subtabs" },
      TABS.map(([id, label]) =>
        h("a", { href: `#/vokabular?tab=${id}`, "aria-current": id === tab ? "page" : null }, label),
      ),
    ),
    content,
  );
}

function listSelect(lists: WordList[], allLabel: string, id: string): HTMLSelectElement {
  return h(
    "select",
    { class: "input", id },
    h("option", { value: "" }, allLabel),
    lists.map((l) => h("option", { value: l.id }, l.name)),
  );
}

async function reviewTab(): Promise<Node> {
  const [lists, due] = await Promise.all([allLists(), dueWords()]);
  const list = listSelect(lists, t.vocab.allWords, "study-list");
  const scope = h(
    "select",
    { class: "input", id: "study-scope" },
    h("option", { value: "due" }, t.vocab.dueOnly),
    h("option", { value: "all" }, t.vocab.allInList),
  );
  const dir = h(
    "select",
    { class: "input", id: "study-dir" },
    h("option", { value: "hr-en" }, t.vocab.hrEn),
    h("option", { value: "en-hr" }, t.vocab.enHr),
  );
  const start = (mode: string) => {
    const q = new URLSearchParams({ mode, scope: scope.value, dir: dir.value });
    if (list.value) q.set("list", list.value);
    location.hash = `/ucenje?${q}`;
  };
  return h(
    "section",
    { class: "card" },
    h("p", null, `${t.home.reviewsDue}: `, h("b", { "data-testid": "due-count" }, String(due.length))),
    h("label", { for: "study-list" }, t.vocab.list),
    list,
    h("label", { for: "study-scope" }, t.vocab.scope),
    scope,
    h("label", { for: "study-dir" }, t.vocab.direction),
    dir,
    h(
      "div",
      { class: "mode-grid" },
      (["flash", "choice", "typing", "matching"] as const).map((m) =>
        h("button", { class: "btn mode", type: "button", onClick: () => start(m) }, t.vocab.modes[m]),
      ),
    ),
  );
}

export function wordRow(word: Word, lists: WordList[], onChange: () => void): HTMLElement {
  const details = h("div", { class: "word-details", hidden: true });
  const toggle = () => {
    details.hidden = !details.hidden;
    if (!details.hidden && !details.hasChildNodes()) {
      replace(
        details,
        word.example ? bilingual(word.example) : null,
        word.mistake ? bilingual(word.mistake.explanation) : null,
        h(
          "p",
          { class: "muted" },
          `${t.common.source}: ${t.sources[word.source]} · ${formatDate(word.createdAt)} · ${t.vocab.nextReview}: ${formatDate(word.srs.due)}`,
        ),
        h(
          "fieldset",
          { class: "lists-field" },
          h("legend", null, t.vocab.lists),
          lists.map((l) =>
            h(
              "label",
              { class: "check" },
              h("input", {
                type: "checkbox",
                checked: word.listIds.includes(l.id),
                onChange: async (e: Event) => {
                  const on = (e.target as HTMLInputElement).checked;
                  word.listIds = on ? [...word.listIds, l.id] : word.listIds.filter((x) => x !== l.id);
                  await setWordLists(word.id, word.listIds);
                },
              }),
              l.name,
            ),
          ),
        ),
        h(
          "button",
          {
            class: "btn small danger",
            type: "button",
            onClick: async () => {
              if (!confirmDelete()) return;
              await deleteWord(word.id);
              onChange();
            },
          },
          t.common.delete,
        ),
      );
    }
  };
  return h(
    "li",
    { class: "word-row", "data-word": word.croatian },
    h(
      "button",
      { class: "word-main", type: "button", onClick: toggle },
      word.kind === "mistake"
        ? h("span", null, h("s", null, word.mistake?.wrong ?? ""), " → ", h("b", null, word.croatian))
        : [
            h("b", null, stressed(word.croatian, word.stressIndex)),
            h("span", { class: "translation", lang: "en" }, word.translation),
          ],
      srBsBadge(word.serbianBosnian),
      h("small", { class: "grammar" }, grammarLine(word)),
    ),
    details,
  );
}

async function wordsTab(ctx: RouteContext): Promise<Node> {
  const [words, lists] = await Promise.all([allWords(), allLists()]);
  const listFilter = listSelect(lists, t.vocab.allWords, "words-list");
  const search = h("input", { class: "input", type: "search", placeholder: t.vocab.search, "aria-label": t.vocab.search });
  const ul = h("ul", { class: "word-list" });
  const render = () => {
    const q = normalize(search.value);
    const shown = words.filter(
      (w) =>
        (!listFilter.value || w.listIds.includes(listFilter.value)) &&
        (!q || normalize(w.croatian).includes(q) || normalize(w.translation).includes(q)),
    );
    replace(ul, shown.length ? shown.map((w) => wordRow(w, lists, ctx.refresh)) : emptyState());
  };
  search.addEventListener("input", render);
  listFilter.addEventListener("change", render);
  render();
  return h("section", null, h("div", { class: "row" }, search, listFilter), h("p", { class: "muted" }, `${words.length} ${t.vocab.words}`), ul);
}

async function listsTab(ctx: RouteContext): Promise<Node> {
  const [lists, words] = await Promise.all([allLists(), allWords()]);
  const name = h("input", { class: "input", placeholder: t.vocab.listName, "aria-label": t.vocab.listName });
  return h(
    "section",
    null,
    h(
      "form",
      {
        class: "row card",
        onSubmit: async (e: Event) => {
          e.preventDefault();
          if (!name.value.trim()) return;
          await createList(name.value);
          ctx.refresh();
        },
      },
      name,
      h("button", { class: "btn primary", type: "submit" }, t.vocab.create),
    ),
    lists.length
      ? h(
          "ul",
          { class: "plain-list" },
          lists.map((l) =>
            h(
              "li",
              { class: "card list-row" },
              h("b", null, l.name),
              h("span", { class: "muted" }, ` ${words.filter((w) => w.listIds.includes(l.id)).length} ${t.vocab.words}`),
              h(
                "div",
                { class: "row" },
                h(
                  "button",
                  {
                    class: "btn small",
                    type: "button",
                    onClick: async () => {
                      const next = window.prompt(t.vocab.listName, l.name);
                      if (next?.trim()) {
                        await renameList(l.id, next);
                        ctx.refresh();
                      }
                    },
                  },
                  t.vocab.rename,
                ),
                h(
                  "button",
                  {
                    class: "btn small danger",
                    type: "button",
                    onClick: async () => {
                      if (!confirmDelete()) return;
                      await deleteList(l.id);
                      ctx.refresh();
                    },
                  },
                  t.common.delete,
                ),
              ),
            ),
          ),
        )
      : emptyState(),
  );
}

/** Manual add: type the word and translation, then tap the stressed letter. */
async function addTab(): Promise<Node> {
  const lists = await allLists();
  const croatian = h("input", { class: "input", id: "add-hr", autocomplete: "off", lang: "hr" });
  const translation = h("input", { class: "input", id: "add-en", autocomplete: "off", lang: "en" });
  const list = listSelect(lists, t.common.noList, "add-list");
  const picker = h("div", { class: "stress-picker" });
  let stressIndex: number | null = null;

  const renderPicker = () => {
    const chars = [...croatian.value.trim()];
    const allowed = new Set(stressableIndexes(croatian.value.trim()));
    if (stressIndex !== null && !allowed.has(stressIndex)) stressIndex = null;
    replace(
      picker,
      chars.map((c, i) =>
        h(
          "button",
          {
            type: "button",
            class: `letter${i === stressIndex ? " on" : ""}`,
            disabled: !allowed.has(i),
            "aria-pressed": String(i === stressIndex),
            onClick: () => {
              stressIndex = i;
              renderPicker();
            },
          },
          c,
        ),
      ),
    );
  };
  croatian.addEventListener("input", renderPicker);

  return h(
    "form",
    {
      class: "card",
      onSubmit: async (e: Event) => {
        e.preventDefault();
        if (!croatian.value.trim() || !translation.value.trim()) return;
        const now = new Date();
        const word: Word = {
          id: newId(),
          kind: "word",
          croatian: croatian.value.trim(),
          translation: translation.value.trim(),
          stressIndex,
          partOfSpeech: null,
          gender: null,
          aspect: null,
          aspectPair: null,
          caseNote: null,
          example: null,
          serbianBosnian: null,
          mistake: null,
          source: "manual",
          createdAt: now.toISOString(),
          listIds: list.value ? [list.value] : [],
          srs: newSrs(now),
        };
        await putWord(word);
        await logActivity("word_added", now);
        toast(t.common.saved);
        croatian.value = "";
        translation.value = "";
        stressIndex = null;
        renderPicker();
      },
    },
    h("label", { for: "add-hr" }, t.vocab.croatian),
    croatian,
    h("p", { class: "hint" }, t.vocab.tapStress),
    picker,
    h("label", { for: "add-en" }, t.vocab.translation),
    translation,
    h("label", { for: "add-list" }, t.vocab.list),
    list,
    h("button", { class: "btn primary", type: "submit" }, t.vocab.add),
  );
}

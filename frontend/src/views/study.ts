import { allWords, dueWords, reviewWord } from "../db/repo";
import { t } from "../i18n/hr";
import { autoGrade, type Grade } from "../lib/srs";
import {
  cardFaces,
  checkTyped,
  choiceOptions,
  matchingRound,
  shuffle,
  type Direction,
} from "../lib/study";
import type { RouteContext } from "../router";
import { bilingual, grammarLine, notice, pageTitle, srBsBadge, stressed, withEn } from "../ui/components";
import { h, replace } from "../ui/dom";
import type { Word } from "../types";

type Mode = "flash" | "choice" | "typing" | "matching";
const MAX_SESSION = 30;

/** The answer side of a card: word with stress, translation, grammar, example. */
function answerDetails(word: Word): HTMLElement {
  if (word.kind === "mistake") {
    return h(
      "div",
      { class: "answer" },
      h("p", { class: "big", lang: "hr" }, word.croatian),
      word.mistake ? bilingual(word.mistake.explanation) : null,
    );
  }
  return h(
    "div",
    { class: "answer" },
    h("p", { class: "big" }, stressed(word.croatian, word.stressIndex), " ", srBsBadge(word.serbianBosnian)),
    h("p", { lang: "en" }, word.translation),
    h("p", { class: "grammar" }, grammarLine(word)),
    word.example ? bilingual(word.example) : null,
  );
}

export async function studyView(ctx: RouteContext): Promise<Node> {
  const mode = (ctx.query.get("mode") ?? "flash") as Mode;
  const listId = ctx.query.get("list");
  const dir = (ctx.query.get("dir") ?? "hr-en") as Direction;
  const scope = ctx.query.get("scope") ?? "due";

  const pool = await allWords();
  let cards =
    scope === "due"
      ? await dueWords(new Date(), listId)
      : shuffle(pool.filter((w) => !listId || w.listIds.includes(listId)));
  // Only flashcards can show mistake cards (they have no translation).
  if (mode !== "flash") cards = cards.filter((w) => w.kind === "word");
  cards = cards.slice(0, MAX_SESSION);

  const stage = h("div", { class: "stage" });
  const page = h("div", { class: "page study" }, pageTitle(t.vocab.modes[mode], "#/vokabular"), stage);

  if (mode === "matching") {
    runMatching(stage, cards, pool);
    return page;
  }
  if (cards.length === 0) {
    replace(stage, h("p", { class: "done" }, t.vocab.sessionDone));
    return page;
  }

  const queue = [...cards];
  const next = () => {
    const word = queue.shift();
    if (!word) {
      replace(stage, h("p", { class: "done" }, t.vocab.sessionDone), h("a", { class: "btn", href: "#/vokabular" }, t.common.back));
      return;
    }
    const counter = h("p", { class: "muted counter" }, `${t.vocab.remaining}: ${queue.length + 1}`);
    const grade = async (g: Grade) => {
      await reviewWord(word.id, g);
      // Wrong answers come back again in this session.
      if (g === "again") queue.push(word);
      next();
    };
    if (mode === "flash") flashcard(stage, counter, word, dir, grade);
    else if (mode === "choice") multipleChoice(stage, counter, word, dir, pool, grade);
    else typing(stage, counter, word, dir, grade);
  };
  next();
  return page;
}

function flashcard(stage: HTMLElement, counter: Node, word: Word, dir: Direction, grade: (g: Grade) => void) {
  const faces = cardFaces(word, dir);
  const isMistake = word.kind === "mistake";
  const front =
    !isMistake && dir === "hr-en" ? stressed(word.croatian, word.stressIndex) : h("span", null, faces.front);
  const answer = h("div", { hidden: true }, answerDetails(word));
  const grades = h(
    "div",
    { class: "grades", hidden: true },
    (["again", "hard", "good", "easy"] as const).map((g) =>
      h("button", { class: `btn grade ${g}`, type: "button", onClick: () => grade(g) }, t.vocab.grades[g]),
    ),
  );
  const show = h(
    "button",
    {
      class: "btn primary",
      type: "button",
      onClick: () => {
        answer.hidden = false;
        grades.hidden = false;
        show.remove();
      },
    },
    t.vocab.showAnswer,
  );
  replace(
    stage,
    counter,
    withEn(isMistake ? t.instr.mistake : t.instr.flash),
    h("div", { class: "flashcard" }, isMistake ? h("small", null, t.vocab.mistakeCard) : null, h("p", { class: "big front" }, front)),
    show,
    answer,
    grades,
  );
}

function feedback(correct: boolean, word: Word, dir: Direction): HTMLElement {
  return h(
    "div",
    { class: `feedback ${correct ? "ok" : "bad"}`, role: "status" },
    h("p", null, correct ? t.vocab.correct : `${t.vocab.wrongAnswer} ${cardFaces(word, dir).back}`),
    answerDetails(word),
  );
}

function nextButton(onClick: () => void): HTMLElement {
  const b = h("button", { class: "btn primary", type: "button", onClick }, t.common.next);
  queueMicrotask(() => b.focus());
  return b;
}

function multipleChoice(
  stage: HTMLElement,
  counter: Node,
  word: Word,
  dir: Direction,
  pool: Word[],
  grade: (g: Grade) => void,
) {
  const options = choiceOptions(word, pool, dir);
  const answer = cardFaces(word, dir).back;
  const after = h("div");
  const buttons = options.map((opt) =>
    h(
      "button",
      {
        class: "btn option",
        type: "button",
        onClick: () => {
          const ok = opt === answer;
          for (const b of buttons) {
            b.disabled = true;
            if (b.textContent === answer) b.classList.add("right");
          }
          if (!ok) (buttons.find((b) => b.textContent === opt) as HTMLElement).classList.add("wrong");
          replace(after, feedback(ok, word, dir), nextButton(() => grade(autoGrade(ok))));
        },
      },
      opt,
    ),
  );
  replace(
    stage,
    counter,
    withEn(dir === "hr-en" ? t.instr.choiceHrEn : t.instr.choiceEnHr),
    h("p", { class: "big front" }, dir === "hr-en" ? stressed(word.croatian, word.stressIndex) : word.translation),
    h("div", { class: "options" }, buttons),
    after,
  );
}

function typing(stage: HTMLElement, counter: Node, word: Word, dir: Direction, grade: (g: Grade) => void) {
  const faces = cardFaces(word, dir);
  const input = h("input", {
    class: "input",
    autocomplete: "off",
    autocapitalize: "off",
    spellcheck: "false",
    lang: dir === "en-hr" ? "hr" : "en",
    "aria-label": t.vocab.translation,
  });
  const after = h("div");
  const form = h(
    "form",
    {
      class: "row",
      onSubmit: (e: Event) => {
        e.preventDefault();
        if (input.disabled) return;
        const result = checkTyped(input.value, faces.back);
        input.disabled = true;
        const g: Grade = result === "correct" ? "good" : result === "diacritics" ? "hard" : "again";
        replace(
          after,
          result === "diacritics" ? notice(t.warn.diacritics) : null,
          feedback(result !== "wrong", word, dir),
          nextButton(() => grade(g)),
        );
      },
    },
    input,
    h("button", { class: "btn primary", type: "submit" }, t.common.check),
  );
  replace(
    stage,
    counter,
    withEn(dir === "en-hr" ? t.instr.typingEnHr : t.instr.typingHrEn),
    h("p", { class: "big front" }, faces.front),
    form,
    after,
  );
  queueMicrotask(() => input.focus());
}

function runMatching(stage: HTMLElement, cards: Word[], pool: Word[]) {
  const source = cards.length >= 2 ? cards : pool.filter((w) => w.kind === "word");
  const round = matchingRound(source);
  if (round.left.length < 2) {
    replace(stage, h("p", { class: "muted" }, t.vocab.notEnoughWords));
    return;
  }
  const missed = new Set<string>();
  const matched = new Set<string>();
  let picked: { id: string; el: HTMLButtonElement } | null = null;

  const finish = async () => {
    for (const item of round.left) await reviewWord(item.id, autoGrade(!missed.has(item.id)));
    replace(
      stage,
      h("p", { class: "done" }, t.vocab.sessionDone),
      h("a", { class: "btn", href: "#/vokabular" }, t.common.back),
    );
  };

  const button = (id: string, text: string, side: "left" | "right") => {
    const el = h("button", { class: "btn match", type: "button", "data-side": side }, text) as HTMLButtonElement;
    el.addEventListener("click", () => {
      if (matched.has(id) && el.disabled) return;
      if (side === "left") {
        picked?.el.classList.remove("picked");
        picked = { id, el };
        el.classList.add("picked");
        return;
      }
      if (!picked) return;
      if (picked.id === id) {
        matched.add(id);
        picked.el.disabled = true;
        el.disabled = true;
        picked.el.classList.replace("picked", "right");
        el.classList.add("right");
        picked = null;
        if (matched.size === round.left.length) void finish();
      } else {
        missed.add(picked.id);
        el.classList.add("wrong");
        setTimeout(() => el.classList.remove("wrong"), 600);
      }
    });
    return el;
  };

  replace(
    stage,
    withEn(t.instr.matching),
    h(
      "div",
      { class: "matching" },
      h("div", { class: "col", lang: "hr" }, round.left.map((i) => button(i.id, i.text, "left"))),
      h("div", { class: "col", lang: "en" }, round.right.map((i) => button(i.id, i.text, "right"))),
    ),
  );
}

import type { Bilingual } from "@croatian-app/shared";
import { t } from "../i18n/hr";
import { checkTyped } from "../lib/study";
import { bilingual, withEn } from "../ui/components";
import { h, replace } from "../ui/dom";

export interface ExerciseSpec {
  instruction: Bilingual;
  /** Text with "___" for the blank (shown as is otherwise). */
  question: string;
  /** Shown in brackets after the question, e.g. the base form. */
  hint?: string;
  /** Choices; empty means a typed answer. */
  options: string[];
  answer: string;
  explanation: Bilingual;
}

/**
 * One exercise checked offline against its fixed answer.
 * `previous` restores an earlier answer; `onAnswer` is called once.
 */
export function exercise(
  spec: ExerciseSpec,
  onAnswer: (value: string, correct: boolean) => void,
  previous?: { value: string; correct: boolean },
): HTMLElement {
  const result = h("div", { class: "ex-result" });
  const showResult = (correct: boolean, diacriticsOnly = false) => {
    replace(
      result,
      h(
        "div",
        { class: `feedback ${correct ? "ok" : "bad"}`, role: "status" },
        h("p", null, correct ? t.vocab.correct : `${t.vocab.wrongAnswer} ${spec.answer}`),
        diacriticsOnly ? withEn(t.warn.diacritics) : null,
        bilingual(spec.explanation),
      ),
    );
  };

  let control: HTMLElement;
  if (spec.options.length) {
    const buttons = spec.options.map((opt) =>
      h(
        "button",
        {
          class: "btn option",
          type: "button",
          onClick: () => answer(opt),
        },
        opt,
      ),
    );
    const answer = (opt: string) => {
      const ok = opt === spec.answer;
      for (const b of buttons) {
        b.disabled = true;
        if (b.textContent === spec.answer) b.classList.add("right");
        else if (b.textContent === opt) b.classList.add("wrong");
      }
      showResult(ok);
      if (!previous) onAnswer(opt, ok);
    };
    control = h("div", { class: "options" }, buttons);
    if (previous) queueMicrotask(() => answer(previous.value));
  } else {
    const input = h("input", { class: "input", autocomplete: "off", autocapitalize: "off", lang: "hr", "aria-label": spec.question });
    const submit = h("button", { class: "btn primary", type: "submit" }, t.common.check);
    const check = (value: string, isRestore: boolean) => {
      const res = checkTyped(value, spec.answer);
      input.disabled = true;
      submit.disabled = true;
      showResult(res === "correct", res === "diacritics");
      if (!isRestore) onAnswer(value, res === "correct");
    };
    control = h(
      "form",
      {
        class: "row",
        onSubmit: (e: Event) => {
          e.preventDefault();
          if (input.value.trim()) check(input.value, false);
        },
      },
      input,
      submit,
    );
    if (previous) {
      input.value = previous.value;
      queueMicrotask(() => check(previous.value, true));
    }
  }

  return h(
    "div",
    { class: "exercise card" },
    withEn(spec.instruction),
    h("p", { class: "question", lang: "hr" }, spec.question, spec.hint ? h("span", { class: "hint" }, ` (${spec.hint})`) : null),
    control,
    result,
  );
}

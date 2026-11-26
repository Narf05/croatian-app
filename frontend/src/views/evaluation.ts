import type { Subject, Sublevel } from "@croatian-app/shared";
import { SUBJECTS } from "@croatian-app/shared/constants";
import {
  acceptGoals,
  answerKey,
  confirmLevels,
  progressOf,
  saveAnswer,
  saveWriting,
  scoreEvaluation,
  SECTIONS,
  sectionQuestions,
  submitEvaluation,
} from "../features/evaluation";
import { getRow } from "../db/repo";
import { getSettings } from "../db/settings";
import { t } from "../i18n/hr";
import type { RouteContext } from "../router";
import { bilingual, emptyState, notice, pageTitle, withAi, withEn } from "../ui/components";
import { h, replace } from "../ui/dom";
import type { Evaluation, TestSection } from "../types";

export async function evaluationView(ctx: RouteContext): Promise<Node> {
  const ev = await getRow("evaluations", ctx.params.id ?? "");
  if (!ev) return emptyState();
  const page = h("div", { class: "page evaluation" }, pageTitle(t.evaluation[ev.kind], "#/"));
  if (ev.status === "in_progress") page.append(testForm(ev, ctx));
  else page.append(await results(ev, ctx));
  return page;
}

function questionBlock(ev: Evaluation, section: TestSection, index: number): HTMLElement {
  const q = sectionQuestions(ev.test, section)[index]!;
  const key = answerKey(section, index);
  const name = `q-${key}`;
  return h(
    "fieldset",
    { class: "question-block", "data-key": key },
    h("legend", null, `${index + 1}. `, h("span", { lang: "hr" }, q.question)),
    withEn(q.instruction),
    q.options.map((opt) =>
      h(
        "label",
        { class: "radio option-label" },
        h("input", {
          type: "radio",
          name,
          value: opt,
          checked: ev.answers[key] === opt,
          onChange: async () => {
            ev.answers[key] = opt;
            await saveAnswer(ev.id, key, opt);
          },
        }),
        h("span", { lang: "hr" }, opt),
      ),
    ),
  );
}

function testForm(ev: Evaluation, ctx: RouteContext): HTMLElement {
  const status = h("div");
  const writing = h("textarea", {
    class: "input",
    rows: 8,
    lang: "hr",
    placeholder: t.evaluation.writingPlaceholder,
    "aria-label": t.subjects.writing,
    value: ev.writingText,
  });
  let timer: ReturnType<typeof setTimeout> | undefined;
  writing.addEventListener("input", () => {
    ev.writingText = writing.value;
    clearTimeout(timer);
    timer = setTimeout(() => void saveWriting(ev.id, writing.value), 400);
  });

  const sectionTitle: Record<TestSection, string> = {
    vocabulary: t.subjects.vocabulary,
    grammar: t.subjects.grammar,
    reading: t.subjects.reading,
  };

  return h(
    "form",
    {
      class: "test",
      onSubmit: async (e: Event) => {
        e.preventDefault();
        clearTimeout(timer);
        await saveWriting(ev.id, writing.value);
        const { answered, total } = progressOf(ev);
        if (answered < total) {
          replace(status, notice(t.warn.noAnswer));
          return;
        }
        if (await withAi(status, () => submitEvaluation(ev.id))) ctx.refresh();
      },
    },
    h("p", null, t.evaluation.intro),
    SECTIONS.map((section) =>
      h(
        "section",
        { class: "card test-section", "data-section": section },
        h("h2", null, sectionTitle[section]),
        section === "reading"
          ? [withEn(t.instr.reading), h("article", { class: "reading-text", lang: "hr" }, ev.test.reading.text)]
          : null,
        sectionQuestions(ev.test, section).map((_, i) => questionBlock(ev, section, i)),
      ),
    ),
    h(
      "section",
      { class: "card test-section", "data-section": "writing" },
      h("h2", null, t.subjects.writing),
      withEn(ev.test.writing.prompt),
      writing,
    ),
    h("button", { class: "btn primary", type: "submit" }, t.evaluation.submit),
    status,
  );
}

async function results(ev: Evaluation, ctx: RouteContext): Promise<HTMLElement> {
  const a = ev.assessment!;
  const { levels } = await getSettings();
  const scores = scoreEvaluation(ev);
  const status = h("div");
  const box = h("div");

  box.append(
    h(
      "section",
      { class: "card" },
      h("h2", null, t.evaluation.results),
      h(
        "ul",
        { class: "plain-list" },
        scores.map((s) => h("li", null, `${t.subjects[s.subject]}: `, h("b", null, `${s.correct}/${s.total}`))),
      ),
      bilingual(a.summary),
      h("h3", null, t.evaluation.writingFeedback),
      bilingual(a.writingFeedback),
    ),
  );

  if (ev.status === "done") {
    box.append(notice(t.warn.evaluationDone, "ok"));
    return box;
  }

  // Step 1: confirm levels (each subject can be accepted or kept).
  if (!ev.confirmedLevels) {
    const form = h(
      "form",
      {
        class: "card",
        onSubmit: async (e: Event) => {
          e.preventDefault();
          const accepted: Partial<Record<Subject, Sublevel>> = {};
          for (const s of a.suggested) {
            const box = form.querySelector<HTMLInputElement>(`input[name=accept-${s.subject}]`);
            if (box?.checked) accepted[s.subject] = s.level;
          }
          await confirmLevels(ev.id, accepted);
          ctx.refresh();
        },
      },
      h("h2", null, t.evaluation.suggested),
      a.suggested.map((s) =>
        h(
          "div",
          { class: "suggested", "data-subject": s.subject },
          h(
            "label",
            { class: "check" },
            h("input", { type: "checkbox", name: `accept-${s.subject}`, checked: true }),
            h("b", null, t.subjects[s.subject]),
            ` ${levels[s.subject]} → `,
            h("b", { class: "level-pill" }, s.level),
          ),
          bilingual(s.reason),
        ),
      ),
      h("button", { class: "btn primary", type: "submit" }, t.evaluation.confirmLevels),
    );
    box.append(form);
    return box;
  }

  // Step 2: accept or edit the goals for next month.
  const goalForm = h(
    "form",
    {
      class: "card",
      onSubmit: async (e: Event) => {
        e.preventDefault();
        const goals = SUBJECTS.flatMap((s) => {
          const proposed = a.goals.find((g) => g.subject === s);
          const field = goalForm.querySelector<HTMLTextAreaElement>(`textarea[name=goal-${s}]`);
          if (!proposed || !field) return [];
          const text = field.value.trim();
          // If edited, the English version no longer matches; keep it only when unchanged.
          const goal = text === proposed.goal.hr ? proposed.goal : { hr: text, en: "" };
          return text ? [{ subject: s, goal }] : [];
        });
        if (await withAi(status, () => acceptGoals(ev.id, goals))) ctx.refresh();
      },
    },
    h("h2", null, t.evaluation.proposedGoals),
    a.goals.map((g) =>
      h(
        "div",
        { class: "goal-edit" },
        h("label", { for: `goal-${g.subject}` }, t.subjects[g.subject]),
        h("textarea", { class: "input", rows: 2, id: `goal-${g.subject}`, name: `goal-${g.subject}`, lang: "hr", value: g.goal.hr }),
        h("small", { class: "en-sub", lang: "en" }, g.goal.en),
      ),
    ),
    h("button", { class: "btn primary", type: "submit" }, t.evaluation.acceptGoals),
    status,
  );
  box.append(goalForm);
  return box;
}

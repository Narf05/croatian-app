import { ai } from "../api/client";
import { goalsForAi, latestAnalysis } from "../features/weekly";
import { deleteRow, getRow, listRows, logActivity, putRow } from "../db/repo";
import { getSettings } from "../db/settings";
import { t } from "../i18n/hr";
import { formatDate } from "../lib/dates";
import { newId } from "../lib/id";
import { overallLevel } from "../lib/levels";
import { navigate, type RouteContext } from "../router";
import { bilingual, confirmDelete, emptyState, entryCard, pageTitle, withAi } from "../ui/components";
import { h } from "../ui/dom";
import type { Lesson } from "../types";
import { exercise } from "./exercise";

export async function lessonsView(): Promise<Node> {
  const [lessons, analysis] = await Promise.all([listRows("lessons"), latestAnalysis()]);
  const topic = h("input", { class: "input", id: "lesson-topic", placeholder: t.lessons.topicPlaceholder, autocomplete: "off" });
  const status = h("div");
  const size = (value: string, label: string, checked = false) =>
    h("label", { class: "radio" }, h("input", { type: "radio", name: "size", value, checked }), label);

  const form = h(
    "form",
    {
      class: "card",
      onSubmit: async (e: Event) => {
        e.preventDefault();
        if (!topic.value.trim()) return;
        const chosen = (form.querySelector("input[name=size]:checked") as HTMLInputElement).value as Lesson["size"];
        const { levels } = await getSettings();
        const level = overallLevel(levels);
        const goals = (await goalsForAi()).map((g) => g.goal);
        const content = await withAi(status, () => ai("lesson", { topic: topic.value.trim(), level, size: chosen, goals }));
        if (!content) return;
        const lesson: Lesson = {
          id: newId(),
          topic: topic.value.trim(),
          size: chosen,
          level,
          createdAt: new Date().toISOString(),
          content,
          answers: {},
        };
        await putRow("lessons", lesson);
        await logActivity("lesson");
        navigate(`/lekcije/${lesson.id}`);
      },
    },
    h("h2", null, t.lessons.newLesson),
    h("label", { for: "lesson-topic" }, t.lessons.topic),
    topic,
    h("div", { class: "row" }, size("short", t.lessons.short, true), size("detailed", t.lessons.detailed)),
    h("button", { class: "btn primary", type: "submit" }, t.lessons.create),
    status,
  );

  const recommended = analysis?.result.lessonTopics ?? [];
  return h(
    "div",
    { class: "page" },
    pageTitle(t.nav.lessons),
    form,
    recommended.length
      ? h(
          "section",
          { class: "card" },
          h("h2", null, t.lessons.recommended),
          h(
            "div",
            { class: "chips" },
            recommended.map((r) =>
              h("button", { class: "chip", type: "button", onClick: () => (topic.value = r.hr) }, r.hr),
            ),
          ),
        )
      : null,
    h("h2", null, t.lessons.saved),
    lessons.length
      ? h(
          "ul",
          { class: "plain-list" },
          lessons.map((l) =>
            h(
              "li",
              null,
              h("a", { class: "card link-card", href: `#/lekcije/${l.id}` }, h("b", null, l.content.title.hr), h("small", { class: "muted" }, ` · ${l.level} · ${formatDate(l.createdAt)}`)),
            ),
          ),
        )
      : emptyState(),
  );
}

export async function lessonView(ctx: RouteContext): Promise<Node> {
  const lesson = await getRow("lessons", ctx.params.id ?? "");
  if (!lesson) return emptyState();
  const { content } = lesson;
  return h(
    "div",
    { class: "page lesson" },
    pageTitle(content.title.hr, "#/lekcije"),
    bilingual(content.title),
    content.parts.map((part, pi) =>
      h(
        "section",
        { class: "lesson-part" },
        content.parts.length > 1 ? h("h2", null, `${t.lessons.part} ${pi + 1}: ${part.title.hr}`) : h("h2", null, part.title.hr),
        bilingual(part.explanation, "div"),
        part.examples.length ? [h("h3", null, t.lessons.examples), part.examples.map((ex) => bilingual(ex))] : null,
        part.exercises.length
          ? [
              h("h3", null, t.lessons.exercises),
              part.exercises.map((ex, ei) => {
                const key = `${pi}.${ei}`;
                return exercise(
                  { ...ex, options: ex.type === "choice" ? ex.options : [] },
                  async (value, correct) => {
                    lesson.answers[key] = { value, correct };
                    await putRow("lessons", lesson);
                  },
                  lesson.answers[key],
                );
              }),
            ]
          : null,
      ),
    ),
    content.vocabulary.length
      ? h("section", null, h("h2", null, t.lessons.vocabulary), content.vocabulary.map((e) => entryCard(e, "lesson")))
      : null,
    h(
      "button",
      {
        class: "btn danger",
        type: "button",
        onClick: async () => {
          if (!confirmDelete()) return;
          await deleteRow("lessons", lesson.id);
          navigate("/lekcije");
        },
      },
      t.common.delete,
    ),
  );
}

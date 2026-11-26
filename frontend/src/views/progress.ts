import { SUBJECTS, SUBLEVELS } from "@croatian-app/shared/constants";
import type { Sublevel } from "@croatian-app/shared";
import { allEvaluations } from "../features/evaluation";
import { currentGoals, latestAnalysis, runWeeklyAnalysis } from "../features/weekly";
import { getSettings, setSetting } from "../db/settings";
import { t } from "../i18n/hr";
import { formatDate } from "../lib/dates";
import { overallLevel, scaleProgress, type Levels } from "../lib/levels";
import { analysisDue, ANALYSIS_EVERY_DAYS } from "../lib/schedule";
import type { RouteContext } from "../router";
import { bilingual, emptyState, pageTitle, toast, withAi } from "../ui/components";
import { h } from "../ui/dom";

function levelBar(label: string, level: Sublevel): HTMLElement {
  return h(
    "div",
    { class: "level-row", "data-subject": label },
    h("span", { class: "level-label" }, label),
    h("span", { class: "bar" }, h("span", { class: "fill", style: `width:${Math.round(scaleProgress(level) * 100)}%` })),
    h("b", { class: "level-value" }, level),
  );
}

export async function progressView(ctx: RouteContext): Promise<Node> {
  const [settings, goals, analysis, evaluations] = await Promise.all([
    getSettings(),
    currentGoals(),
    latestAnalysis(),
    allEvaluations(),
  ]);
  const levels = settings.levels;
  const status = h("div");
  const now = new Date();
  const nextAnalysis = settings.lastAnalysisAt
    ? new Date(new Date(settings.lastAnalysisAt).getTime() + ANALYSIS_EVERY_DAYS * 86400000).toISOString()
    : null;

  const editor = h(
    "form",
    {
      class: "level-editor",
      hidden: true,
      onSubmit: async (e: Event) => {
        e.preventDefault();
        const next = { ...levels } as Levels;
        for (const s of SUBJECTS) next[s] = (editor.querySelector(`[name=${s}]`) as HTMLSelectElement).value as Sublevel;
        await setSetting("levels", next);
        toast(t.settings.savedSettings);
        ctx.refresh();
      },
    },
    SUBJECTS.map((s) =>
      h(
        "label",
        { class: "row" },
        t.subjects[s],
        h("select", { class: "input", name: s }, SUBLEVELS.map((l) => h("option", { value: l, selected: l === levels[s] }, l))),
      ),
    ),
    h("button", { class: "btn primary", type: "submit" }, t.progress.saveLevels),
  );

  return h(
    "div",
    { class: "page progress" },
    pageTitle(t.nav.progress, "#/vise"),
    h(
      "section",
      { class: "card" },
      h("h2", null, t.progress.overall, ": ", h("span", { class: "level-pill", "data-testid": "overall-level" }, overallLevel(levels))),
      h("h3", null, t.progress.levels),
      SUBJECTS.map((s) => levelBar(t.subjects[s], levels[s])),
      h(
        "button",
        { class: "btn link", type: "button", onClick: () => (editor.hidden = !editor.hidden) },
        t.progress.editLevels,
      ),
      editor,
    ),
    h(
      "section",
      { class: "card" },
      h("h2", null, t.progress.goals),
      goals
        ? goals.goals.map((g) => h("div", { class: "goal" }, h("b", null, t.subjects[g.subject]), bilingual(g.goal)))
        : h("p", { class: "muted" }, t.progress.noGoals),
    ),
    h(
      "section",
      { class: "card" },
      h("h2", null, t.progress.analysis),
      analysis
        ? [
            h("p", { class: "muted" }, formatDate(analysis.createdAt)),
            bilingual(analysis.result.summary),
            h("h3", null, t.progress.goalProgress),
            analysis.result.goalProgress.map((g) => h("div", null, h("b", null, t.subjects[g.subject]), bilingual(g.progress))),
            h("h3", null, t.progress.review),
            analysis.result.review.map((r) => bilingual(r)),
            h("h3", null, t.progress.lessonTopics),
            analysis.result.lessonTopics.map((r) => bilingual(r)),
            h("h3", null, t.progress.grammarToDrill),
            analysis.result.grammar.map((r) => bilingual(r)),
          ]
        : h("p", { class: "muted" }, t.progress.noAnalysis),
      analysisDue(settings.lastAnalysisAt, now)
        ? h(
            "button",
            {
              class: "btn primary",
              type: "button",
              onClick: async () => {
                if (await withAi(status, () => runWeeklyAnalysis())) ctx.refresh();
              },
            },
            t.progress.runAnalysis,
          )
        : nextAnalysis
          ? h("p", { class: "muted" }, `${t.progress.nextAnalysis}: ${formatDate(nextAnalysis)}`)
          : null,
      status,
    ),
    h(
      "section",
      { class: "card" },
      h("h2", null, t.progress.evaluations),
      evaluations.length
        ? h(
            "ul",
            { class: "plain-list" },
            evaluations.map((e) =>
              h(
                "li",
                null,
                h("a", { href: `#/provjera/${e.id}` }, `${t.evaluation[e.kind]} · ${formatDate(e.createdAt)}`),
              ),
            ),
          )
        : emptyState(),
    ),
  );
}

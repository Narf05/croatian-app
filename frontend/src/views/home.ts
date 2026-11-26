import { SUBJECTS } from "@croatian-app/shared/constants";
import { allEvaluations, startEvaluation } from "../features/evaluation";
import { currentGoals, latestAnalysis, prepareDailyWords, runWeeklyAnalysis } from "../features/weekly";
import { dueWords, listRows } from "../db/repo";
import { getSettings, setSetting } from "../db/settings";
import { t } from "../i18n/hr";
import { localDate } from "../lib/dates";
import { overallLevel } from "../lib/levels";
import { analysisDue, evaluationDue, todaysWords, unfinishedEvaluation } from "../lib/schedule";
import { navigate, type RouteContext } from "../router";
import { bilingual, entryCard, withAi } from "../ui/components";
import { h } from "../ui/dom";
import { connectionForm } from "./settings";

export async function homeView(ctx: RouteContext): Promise<Node> {
  const settings = await getSettings();
  if (!settings.onboarded) return welcome(ctx);

  const now = new Date();
  const [due, batches, evaluations, analysis, goals] = await Promise.all([
    dueWords(now),
    listRows("dailyBatches"),
    allEvaluations(),
    latestAnalysis(),
    currentGoals(),
  ]);
  const page = h("div", { class: "page home" }, h("h1", null, t.appName));

  // Monthly evaluation (or unfinished one)
  const open = unfinishedEvaluation(evaluations);
  const evalDue = evaluationDue(evaluations, now);
  if (open || evalDue) {
    const status = h("div");
    page.append(
      h(
        "section",
        { class: "card highlight" },
        h("h2", null, open ? t.evaluation[open.kind] : evalDue === "placement" ? t.home.placementDue : t.home.evaluationDue),
        h(
          "button",
          {
            class: "btn primary",
            type: "button",
            onClick: async () => {
              if (open) return navigate(`/provjera/${open.id}`);
              const ev = await withAi(status, () => startEvaluation(evalDue ?? "monthly"));
              if (ev) navigate(`/provjera/${ev.id}`);
            },
          },
          open ? t.home.resumeEvaluation : t.home.startEvaluation,
        ),
        status,
      ),
    );
  }

  // Weekly analysis
  if (analysisDue(settings.lastAnalysisAt, now)) {
    const status = h("div");
    page.append(
      h(
        "section",
        { class: "card highlight" },
        h("h2", null, t.home.analysisDue),
        h(
          "button",
          {
            class: "btn primary",
            type: "button",
            onClick: async () => {
              if (await withAi(status, () => runWeeklyAnalysis())) ctx.refresh();
            },
          },
          t.home.runAnalysis,
        ),
        status,
      ),
    );
  }

  // Reviews due
  page.append(
    h(
      "section",
      { class: "card" },
      h("h2", null, `${t.home.reviewsDue}: `, h("span", { class: "count", "data-testid": "due-count" }, String(due.length))),
      due.length
        ? h("a", { class: "btn primary", href: "#/ucenje?mode=flash&scope=due" }, t.home.reviewNow)
        : h("p", { class: "muted" }, t.home.noReviews),
    ),
  );

  // Words of the day
  const words = todaysWords(batches, localDate(now));
  const dailyStatus = h("div");
  page.append(
    h(
      "section",
      { class: "card" },
      h("h2", null, t.home.todaysWords),
      words.length
        ? words.map((w) => entryCard(w, "daily"))
        : [
            h("p", { class: "muted" }, t.home.noDailyWords),
            h(
              "button",
              {
                class: "btn",
                type: "button",
                onClick: async () => {
                  if (await withAi(dailyStatus, () => prepareDailyWords())) ctx.refresh();
                },
              },
              t.home.prepareDailyWords,
            ),
            dailyStatus,
          ],
    ),
  );

  // Levels, goals and the weekly recommendation
  page.append(
    h(
      "section",
      { class: "card" },
      h("h2", null, t.home.levels, ": ", h("span", { class: "level-pill" }, overallLevel(settings.levels))),
      h(
        "ul",
        { class: "levels-inline" },
        SUBJECTS.map((s) => h("li", null, `${t.subjects[s]} `, h("b", null, settings.levels[s]))),
      ),
      h("a", { href: "#/napredak" }, t.nav.progress, " ›"),
    ),
  );
  if (goals) {
    page.append(
      h(
        "section",
        { class: "card" },
        h("h2", null, t.home.goals),
        goals.goals.map((g) => h("div", { class: "goal" }, h("b", null, t.subjects[g.subject]), bilingual(g.goal))),
      ),
    );
  }
  if (analysis) {
    page.append(h("section", { class: "card" }, h("h2", null, t.home.recommendation), bilingual(analysis.result.summary)));
  }
  return page;
}

/** First launch: connect to the backend and take the placement test (or skip it). */
function welcome(ctx: RouteContext): Node {
  const status = h("div");
  return h(
    "div",
    { class: "page welcome" },
    h("h1", null, t.home.welcomeTitle),
    h("p", null, t.home.welcomeText),
    connectionForm(),
    h(
      "button",
      {
        class: "btn primary",
        type: "button",
        onClick: async () => {
          const ev = await withAi(status, () => startEvaluation("placement"));
          if (ev) navigate(`/provjera/${ev.id}`);
        },
      },
      t.home.startPlacement,
    ),
    h(
      "button",
      {
        class: "btn link",
        type: "button",
        onClick: async () => {
          await setSetting("onboarded", true);
          ctx.refresh();
        },
      },
      t.home.skipPlacement,
    ),
    status,
  );
}

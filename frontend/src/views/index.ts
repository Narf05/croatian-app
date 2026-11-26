import { route } from "../router";
import { conversationsView, conversationView } from "./conversation";
import { dailyView } from "./daily";
import { evaluationView } from "./evaluation";
import { drillSetView, grammarView } from "./grammar";
import { homeView } from "./home";
import { lessonsView, lessonView } from "./lessons";
import { moreView } from "./more";
import { progressView } from "./progress";
import { readingListView, readingView } from "./reading";
import { settingsView } from "./settings";
import { songsView, songView } from "./songs";
import { studyView } from "./study";
import { translateView } from "./translate";
import { vocabularyView } from "./vocabulary";

export function registerViews(): void {
  route("/", "home", homeView);
  route("/vokabular", "vocabulary", vocabularyView);
  route("/ucenje", "vocabulary", studyView);
  route("/prijevod", "translate", translateView);
  route("/lekcije", "lessons", lessonsView);
  route("/lekcije/:id", "lessons", lessonView);
  route("/vise", "more", moreView);
  route("/pjesme", "more", songsView);
  route("/pjesme/:id", "more", songView);
  route("/citanje", "more", readingListView);
  route("/citanje/:id", "more", readingView);
  route("/razgovor", "more", conversationsView);
  route("/razgovor/:id", "more", conversationView);
  route("/gramatika", "more", grammarView);
  route("/gramatika/:id", "more", drillSetView);
  route("/rijeci-dana", "more", dailyView);
  route("/napredak", "more", progressView);
  route("/provjera/:id", "home", evaluationView);
  route("/postavke", "more", settingsView);
}

import { backupFileName, exportAll, importAll } from "../db/backup";
import { closeDb } from "../db/db";
import { getSettings, setSetting } from "../db/settings";
import { t } from "../i18n/hr";
import { notice, pageTitle, toast } from "../ui/components";
import { h, replace } from "../ui/dom";

/** Backend address + access code (also used on the welcome screen). */
export function connectionForm(): HTMLElement {
  const url = h("input", { class: "input", type: "url", id: "backend-url", autocomplete: "off", inputmode: "url" });
  const token = h("input", { class: "input", type: "password", id: "access-token", autocomplete: "off" });
  const status = h("div", { class: "status" });
  void getSettings().then((s) => {
    url.value = s.backendUrl;
    token.value = s.accessToken;
  });

  const save = async () => {
    await setSetting("backendUrl", url.value.trim().replace(/\/+$/, ""));
    await setSetting("accessToken", token.value.trim());
    toast(t.settings.savedSettings);
  };

  const test = async () => {
    await save();
    try {
      const res = await fetch(`${url.value.trim().replace(/\/+$/, "")}/health`);
      replace(status, res.ok ? notice(t.warn.connectionOk, "ok") : notice(t.warn.connectionFailed));
    } catch {
      replace(status, notice(t.warn.connectionFailed));
    }
  };

  return h(
    "section",
    { class: "card" },
    h("h2", null, t.settings.backend),
    h("label", { for: "backend-url" }, t.settings.backendUrl),
    url,
    h("label", { for: "access-token" }, t.settings.accessToken),
    token,
    h(
      "div",
      { class: "row" },
      h("button", { class: "btn primary", type: "button", onClick: save }, t.settings.saveConnection),
      h("button", { class: "btn", type: "button", onClick: test }, t.settings.testConnection),
    ),
    status,
  );
}

function download(name: string, content: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: "application/json" }));
  const a = h("a", { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  // Keep the URL alive long enough for slow downloads to start.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function settingsView(): Node {
  const status = h("div");
  const fileInput = h("input", {
    type: "file",
    accept: "application/json,.json",
    hidden: true,
    "data-testid": "import-file",
    onChange: async () => {
      const file = fileInput.files?.[0];
      fileInput.value = "";
      if (!file) return;
      if (!window.confirm(`${t.warn.confirmImport.hr}\n${t.warn.confirmImport.en}`)) return;
      try {
        await importAll(JSON.parse(await file.text()));
        await closeDb();
        replace(status, notice(t.warn.imported, "ok"));
      } catch {
        replace(status, notice(t.warn.importFailed));
      }
    },
  }) as HTMLInputElement;

  return h(
    "div",
    { class: "page" },
    pageTitle(t.nav.settings, "#/vise"),
    connectionForm(),
    h(
      "section",
      { class: "card" },
      h("h2", null, t.settings.backup),
      h(
        "div",
        { class: "row" },
        h(
          "button",
          {
            class: "btn primary",
            type: "button",
            onClick: async () => {
              download(backupFileName(), JSON.stringify(await exportAll(), null, 1));
              replace(status, notice(t.warn.exported, "ok"));
            },
          },
          t.settings.exportData,
        ),
        h("button", { class: "btn", type: "button", onClick: () => fileInput.click() }, t.settings.importData),
      ),
      fileInput,
      status,
    ),
  );
}

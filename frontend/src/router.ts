export interface RouteContext {
  params: Record<string, string>;
  query: URLSearchParams;
  /** Re-render the current view. */
  refresh: () => void;
}

export type View = (ctx: RouteContext) => Node | Promise<Node>;

interface Route {
  pattern: RegExp;
  keys: string[];
  view: View;
  /** Which bottom-nav tab is active. */
  tab: string;
}

const routes: Route[] = [];

/** Register a route like "/lekcije/:id". */
export function route(path: string, tab: string, view: View): void {
  const keys: string[] = [];
  const pattern = new RegExp(
    `^${path.replace(/:(\w+)/g, (_, key: string) => {
      keys.push(key);
      return "([^/]+)";
    })}$`,
  );
  routes.push({ pattern, keys, view, tab });
}

export interface Match {
  view: View;
  tab: string;
  params: Record<string, string>;
  query: URLSearchParams;
}

/** Match a location hash such as "#/lekcije/abc?x=1". */
export function match(hash: string): Match | null {
  const raw = hash.replace(/^#/, "") || "/";
  const [path = "/", search = ""] = raw.split("?");
  for (const r of routes) {
    const m = r.pattern.exec(path);
    if (!m) continue;
    const params: Record<string, string> = {};
    r.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1] ?? "")));
    return { view: r.view, tab: r.tab, params, query: new URLSearchParams(search) };
  }
  return null;
}

export function navigate(path: string): void {
  location.hash = path;
}

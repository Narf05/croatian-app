import { createApp } from "./app";
import { createClaudeCaller } from "./claude";

/** Cloudflare Worker entry point. */
export default createApp({
  makeCaller: (env) => createClaudeCaller(env.ANTHROPIC_API_KEY),
});

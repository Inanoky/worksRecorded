import { registerHooks } from "node:module";

const empty = new URL(
  "../../node_modules/next/dist/compiled/server-only/empty.js",
  import.meta.url,
).href;
registerHooks({
  resolve(specifier, context, nextResolve) {
    return specifier === "server-only"
      ? { url: empty, shortCircuit: true }
      : nextResolve(specifier, context);
  },
});

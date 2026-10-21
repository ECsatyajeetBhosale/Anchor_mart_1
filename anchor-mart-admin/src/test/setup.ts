import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Vitest does not unmount between tests on its own; without this a component
// rendered in one test is still in the document during the next one.
afterEach(cleanup);

// Node 25+ ships its own `localStorage` global, which is `undefined` unless the
// process starts with `--localstorage-file` — and it shadows jsdom's working
// one, so every test touching storage threw. Point it back at jsdom's.
const dom = (globalThis as { jsdom?: { window: Window } }).jsdom;
if (dom && globalThis.localStorage == null) {
  for (const key of ["localStorage", "sessionStorage"] as const) {
    Object.defineProperty(globalThis, key, {
      configurable: true,
      value: dom.window[key],
    });
  }
}

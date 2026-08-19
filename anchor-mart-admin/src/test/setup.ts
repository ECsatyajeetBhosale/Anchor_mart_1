import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Vitest does not unmount between tests on its own; without this a component
// rendered in one test is still in the document during the next one.
afterEach(cleanup);

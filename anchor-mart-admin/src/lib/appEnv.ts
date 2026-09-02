/**
 * Which deployment this build is, from `VITE_APP_ENV`.
 *
 * Distinct from Vite's `MODE`/`DEV`/`PROD`, which describe *how* the bundle was
 * compiled. This describes *which backend it was pointed at*, and it is what
 * side effects that reach outside our own infrastructure branch on.
 *
 * Set per env file: `local` in `.env.development`, `production` in
 * `.env.production`.
 */

/** Read at call time, not at module scope, so tests can `vi.stubEnv` it. */
function rawAppEnv(): string {
  return (import.meta.env.VITE_APP_ENV as string | undefined)?.trim() ?? "";
}

/**
 * True only for an exact `production`.
 *
 * **Fails closed on purpose.** A missing, misspelt or empty `VITE_APP_ENV`
 * counts as not-production, so the failure mode of a broken env file is "the
 * upload didn't happen" rather than "a local test file is now in the
 * production bucket". The same applies under Vitest, where no env file is
 * loaded at all and this is therefore `false` unless a test stubs it.
 */
export function isProductionEnv(): boolean {
  return rawAppEnv() === "production";
}

/**
 * Whether media bytes may leave the browser.
 *
 * Gates both upload mechanisms in Flow 26:
 *  - the presigned **S3 POST** (`features/media`) — the browser writing
 *    straight into the shared bucket, which is what we do not want a
 *    developer's test file doing;
 *  - the **chat multipart** upload (`/api/chat/upload-media/`), which posts to
 *    our own API server rather than to S3, but is gated alongside it so
 *    "media upload" means one thing across the panel.
 *
 * A separate name from {@link isProductionEnv} because this is a policy, not a
 * fact: if the rule ever changes (a dedicated dev bucket, say) it changes here
 * and every call site follows.
 */
export function isMediaUploadEnabled(): boolean {
  return isProductionEnv();
}

import { runGithubSync, saveGithubPatForm } from "@/app/actions/settings";
import {
  SETTING_GH_LOGIN,
  SETTING_GITHUB_PAT,
  SETTING_LAST_GH_ERROR,
  SETTING_LAST_GH_SYNC,
  getSetting,
} from "@/lib/settings";
import { SyncGithubButton } from "@/components/SyncGithubButton";

export default async function SettingsPage() {
  const [pat, lastSync, syncErr, login] = await Promise.all([
    getSetting(SETTING_GITHUB_PAT),
    getSetting(SETTING_LAST_GH_SYNC),
    getSetting(SETTING_LAST_GH_ERROR),
    getSetting(SETTING_GH_LOGIN),
  ]);

  const syncLabel = lastSync
    ? new Date(lastSync).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Never";

  return (
    <main>
      <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-purple">
        Integrations
      </p>
      <h2 className="mt-2 text-2xl font-bold tracking-tight text-text">Settings</h2>
      <p className="mt-2 max-w-xl text-sm text-muted2">
        Store a GitHub personal access token locally in SQLite (this machine only).
        Use a fine-grained token with read access to user data; contribution calendar
        uses the authenticated user tied to the token.
      </p>

      <section className="mt-8 rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h3 className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
          GitHub
        </h3>
        {login ? (
          <p className="mt-2 text-sm text-muted2">
            Last synced account:{" "}
            <span className="font-mono text-text">{login}</span>
          </p>
        ) : null}

        <form action={saveGithubPatForm} className="mt-4 flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-xs text-muted2">
            Personal access token
            <input
              type="password"
              name="pat"
              placeholder="ghp_… or fine-grained token"
              defaultValue={pat ?? ""}
              autoComplete="off"
              className="font-mono text-sm"
            />
          </label>
          <button
            type="submit"
            className="self-start rounded-lg border border-border2 bg-surface2 px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-muted2 transition-colors hover:border-purple hover:text-purple"
          >
            Save token
          </button>
        </form>

        <div className="mt-6 border-t border-border pt-6">
          <p className="text-xs text-muted2">
            Sync pulls your public contribution calendar (same as your GitHub profile
            graph) for roughly the last 400 days and stores daily totals locally.
          </p>
          <p className="mt-2 font-mono text-[11px] text-muted">
            Last sync: {syncLabel}
          </p>
          {syncErr ? (
            <p className="mt-2 rounded border border-amber/40 bg-amber-dim px-3 py-2 text-sm text-amber">
              {syncErr}
            </p>
          ) : null}
          <div className="mt-4">
            <SyncGithubButton syncAction={runGithubSync} />
          </div>
        </div>
      </section>

      <p className="mt-8 text-xs text-muted">
        Token is stored in <code className="font-mono text-muted2">prisma/dev.db</code>.
        Do not commit the database or share it.
      </p>
    </main>
  );
}

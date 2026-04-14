import { runGithubSync, saveGithubPatForm } from "@/app/actions/settings";
import { auth } from "@/auth";
import {
  ensureSeededPlanAction,
  updatePlanConstraints,
} from "@/app/actions/plan";
import {
  SETTING_GH_LOGIN,
  SETTING_GITHUB_PAT,
  SETTING_LAST_GH_ERROR,
  SETTING_LAST_GH_SYNC,
  getSetting,
} from "@/lib/settings";
import { SyncGithubButton } from "@/components/SyncGithubButton";
import { ensureSeededPlanForUser } from "@/lib/plan/service";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await auth();
  const plan = await ensureSeededPlanForUser(session?.user?.id);
  const constraints = await prisma.planConstraint.findFirst({
    where: { planId: plan.id },
  });
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
        Store a GitHub personal access token in your configured Postgres database.
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
            graph) for up to the last year and stores daily totals.
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

      <section className="mt-8 rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h3 className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
          Plan constraints
        </h3>
        <p className="mt-2 text-sm text-muted2">
          Stored at plan-level so future 4-month plans can have different limits.
        </p>
        <form action={updatePlanConstraints} className="mt-4 grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="planId" value={plan.id} />
          <label className="text-xs text-muted2">
            Min hours/week
            <input
              className="mt-1 w-full"
              type="number"
              name="minHoursPerWeek"
              defaultValue={constraints?.minHoursPerWeek ?? 13}
            />
          </label>
          <label className="text-xs text-muted2">
            Max hours/week
            <input
              className="mt-1 w-full"
              type="number"
              name="maxHoursPerWeek"
              defaultValue={constraints?.maxHoursPerWeek ?? 18}
            />
          </label>
          <label className="text-xs text-muted2">
            Note
            <input
              className="mt-1 w-full"
              type="text"
              name="note"
              defaultValue={constraints?.note ?? ""}
            />
          </label>
          <div className="flex items-center gap-4 pt-6 text-xs text-muted2">
            <label>
              <input
                type="checkbox"
                name="hasFullTimeJob"
                defaultChecked={constraints?.hasFullTimeJob ?? true}
              />{" "}
              Full-time job
            </label>
            <label>
              <input
                type="checkbox"
                name="eveningsWeekends"
                defaultChecked={constraints?.eveningsWeekends ?? true}
              />{" "}
              Evenings + weekends
            </label>
          </div>
          <button
            type="submit"
            className="self-start rounded-lg border border-border2 bg-surface2 px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-muted2 transition-colors hover:border-purple hover:text-purple"
          >
            Save constraints
          </button>
        </form>
        <form action={ensureSeededPlanAction} className="mt-3">
          <button
            type="submit"
            className="rounded border border-border2 px-3 py-1 font-mono text-[11px] uppercase text-muted2 hover:border-teal hover:text-teal"
          >
            Re-run plan bootstrap
          </button>
        </form>
      </section>

      <p className="mt-8 text-xs text-muted">
        Token is stored in the database configured by{" "}
        <code className="font-mono text-muted2">DATABASE_URL</code>. Keep production
        credentials private.
      </p>
    </main>
  );
}

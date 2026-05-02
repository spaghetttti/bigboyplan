import { requireAuth } from "@/lib/auth/require-auth";
import { updateSettingsForm, runGithubSync } from "@/app/actions/settings";
import { addCategory, deleteCategory, updateCategoryColor } from "@/app/actions/categories";
import { ensureActivePlanAction } from "@/app/actions/plan";
import { getUserSettings } from "@/lib/settings";
import { SyncGithubButton } from "@/components/SyncGithubButton";
import { getAllCategories } from "@/lib/categories";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const userId = await requireAuth();

  const [settings, categories] = await Promise.all([
    getUserSettings(userId),
    getAllCategories(userId),
  ]);

  return (
    <main>
      <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-purple">
        Integrations
      </p>
      <h2 className="mt-2 text-2xl font-bold tracking-tight text-text">Settings</h2>

      {/* User settings form */}
      <section className="mt-8 rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h3 className="font-mono text-[10px] uppercase tracking-widest text-muted2 ">
          Profile &amp; integrations
        </h3>
        <form action={updateSettingsForm} className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs text-muted2 ">
            LeetCode username
            <input
              type="text"
              name="leetcodeUsername"
              defaultValue={settings.leetcodeUsername ?? ""}
              placeholder="your-lc-handle"
              autoComplete="off"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted2 ">
            GitHub username
            <input
              type="text"
              name="githubUsername"
              defaultValue={settings.githubUsername ?? ""}
              placeholder="your-gh-handle"
              autoComplete="off"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted2  sm:col-span-2">
            GitHub personal access token
            <input
              type="password"
              name="githubToken"
              placeholder="ghp_… or fine-grained token"
              defaultValue={settings.githubToken ?? ""}
              autoComplete="off"
              className="font-mono text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted2 ">
            Timezone
            <input
              type="text"
              name="timezone"
              defaultValue={settings.timezone}
              placeholder="UTC"
            />
          </label>
          <button
            type="submit"
            className="self-end rounded-lg border border-border2 bg-surface2 px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-muted2  transition-colors hover:border-purple hover:text-purple"
          >
            Save settings
          </button>
        </form>

        <div className="mt-6 border-t border-border pt-6">
          <p className="text-xs text-muted2 ">
            Sync pulls your public contribution calendar (same as your GitHub profile
            graph) for up to the last year and stores daily commit totals.
          </p>
          <div className="mt-4">
            <SyncGithubButton syncAction={runGithubSync} />
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="mt-8 rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h3 className="font-mono text-[10px] uppercase tracking-widest text-muted2 ">
          Categories
        </h3>
        <p className="mt-2 text-sm text-muted2 ">
          System categories cannot be deleted. Custom categories can be added and removed.
        </p>

        <ul className="mt-4 flex flex-col gap-2">
          {categories.map((cat) => (
            <li key={cat.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
              <form action={updateCategoryColor.bind(null, cat.id)} className="flex items-center gap-2 flex-1">
                <input
                  type="color"
                  name="color"
                  defaultValue={cat.color}
                  className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent p-0"
                  title="Pick color"
                />
                <span className="font-mono text-[11px] uppercase tracking-wider text-text">
                  {cat.name}
                </span>
                {cat.isSystem && (
                  <span className="font-mono text-[9px] uppercase text-muted2 ">system</span>
                )}
                <button
                  type="submit"
                  className="ml-auto font-mono text-[10px] uppercase text-muted2  hover:text-purple"
                >
                  Save color
                </button>
              </form>
              {!cat.isSystem && (
                <form action={deleteCategory.bind(null, cat.id)}>
                  <button
                    type="submit"
                    className="font-mono text-[10px] uppercase text-coral hover:underline"
                  >
                    Delete
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>

        <form action={addCategory} className="mt-4 flex flex-wrap gap-2 items-end">
          <label className="flex flex-col gap-1 text-xs text-muted2 ">
            Name
            <input
              type="text"
              name="name"
              placeholder="e.g. RUST"
              className="w-32 uppercase"
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted2 ">
            Color
            <input
              type="color"
              name="color"
              defaultValue="#a78bfa"
              className="h-10 w-10 cursor-pointer rounded border-0 bg-transparent p-0"
            />
          </label>
          <button
            type="submit"
            className="rounded-lg border border-border2 bg-surface2 px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-muted2  transition-colors hover:border-purple hover:text-purple"
          >
            Add category
          </button>
        </form>
      </section>

      {/* Plan bootstrap */}
      <section className="mt-8 rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h3 className="font-mono text-[10px] uppercase tracking-widest text-muted2 ">
          Plan
        </h3>
        <p className="mt-2 text-sm text-muted2 ">
          Creates a default active plan if you don&apos;t have one yet.
        </p>
        <form action={ensureActivePlanAction} className="mt-3">
          <button
            type="submit"
            className="rounded border border-border2 px-3 py-1 font-mono text-[11px] uppercase text-muted2  hover:border-teal hover:text-teal"
          >
            Ensure active plan
          </button>
        </form>
      </section>

      <p className="mt-8 text-xs text-muted2 ">
        Token is stored in the database configured by{" "}
        <code className="font-mono text-muted2 ">DATABASE_URL</code>. Keep production
        credentials private.
      </p>
    </main>
  );
}

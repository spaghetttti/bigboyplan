"use client";

import { useState, useTransition } from "react";

export function SyncGithubButton({
  syncAction,
}: {
  syncAction: () => Promise<{ ok: true } | { ok: false; error: string }>;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setMessage(null);
          startTransition(async () => {
            const r = await syncAction();
            if (r.ok) setMessage("Sync completed.");
            else setMessage(r.error);
          });
        }}
        className="rounded-lg border border-border2 bg-surface2 px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-muted2 transition-colors hover:border-teal hover:text-teal disabled:opacity-50"
      >
        {pending ? "Syncing…" : "Sync GitHub now"}
      </button>
      {message ? (
        <p className="mt-2 text-sm text-muted2" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}

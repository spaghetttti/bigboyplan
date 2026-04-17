"use client";

import { useState, useTransition } from "react";

export function CheckInButton({
  isCheckedIn: initialCheckedIn,
  checkInAction,
}: {
  isCheckedIn: boolean;
  checkInAction: () => Promise<{ ok: true } | { ok: false; error: string }>;
}) {
  const [checkedIn, setCheckedIn] = useState(initialCheckedIn);
  const [showPop, setShowPop] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (checkedIn) return;
    setError(null);
    setCheckedIn(true);
    startTransition(async () => {
      const result = await checkInAction();
      if (!result.ok) {
        setCheckedIn(false);
        setError(result.error);
      } else {
        setShowPop(true);
        setTimeout(() => setShowPop(false), 900);
      }
    });
  }

  return (
    <div className="relative mt-6 flex items-center gap-3">
      <style>{`
        @keyframes checkin-pop {
          0%   { transform: scale(1);    opacity: 1; }
          40%  { transform: scale(1.18); opacity: 1; }
          100% { transform: scale(1);    opacity: 0; }
        }
        .checkin-pop-anim {
          animation: checkin-pop 0.9s ease-out forwards;
        }
      `}</style>

      <button
        type="button"
        disabled={pending || checkedIn}
        onClick={handleClick}
        className={`relative overflow-hidden rounded-xl px-6 py-3 font-mono text-[11px] uppercase tracking-widest transition-all duration-200 ${
          checkedIn
            ? "border border-purple bg-purple/20 text-purple"
            : "border border-border2 bg-surface2 text-muted2 hover:border-purple hover:text-purple"
        } disabled:cursor-default`}
      >
        {checkedIn ? "✓ Checked in" : pending ? "Checking in…" : "Check In"}
      </button>

      {showPop && (
        <span
          aria-hidden="true"
          className="checkin-pop-anim pointer-events-none absolute left-0 top-0 flex h-full w-full items-center justify-center rounded-xl bg-purple/40 font-mono text-[13px] text-purple"
        >
          ✓
        </span>
      )}

      {error && (
        <p className="text-xs text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { checkInToday } from "@/app/actions/checkin";

const CAMPFIRE_GIF =
  "https://i.pinimg.com/originals/97/e9/79/97e979731beadb50be38e6e273ebfeef.gif";

const FADE_MS = 420; // matches the keyframe durations in globals.css
const HOLD_MS = 2400; // time at full opacity before auto-dismissing

type Phase = "hidden" | "in" | "out";

export function CheckInButton({ isCheckedIn: initialCheckedIn }: { isCheckedIn: boolean }) {
  const [checkedIn, setCheckedIn] = useState(initialCheckedIn);
  const [phase, setPhase] = useState<Phase>("hidden");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Auto-dismiss timeline whenever we enter "in" phase
  useEffect(() => {
    if (phase !== "in") return;
    const fadeOutAt = setTimeout(() => setPhase("out"), HOLD_MS);
    const unmountAt = setTimeout(() => setPhase("hidden"), HOLD_MS + FADE_MS);
    return () => {
      clearTimeout(fadeOutAt);
      clearTimeout(unmountAt);
    };
  }, [phase]);

  function dismiss() {
    if (phase !== "in") return;
    setPhase("out");
    setTimeout(() => setPhase("hidden"), FADE_MS);
  }

  function handleClick() {
    if (checkedIn) return;
    setError(null);
    setCheckedIn(true);
    startTransition(async () => {
      const result = await checkInToday();
      if (!result.ok) {
        setCheckedIn(false);
        setError(result.error);
      } else {
        setPhase("in");
      }
    });
  }

  const overlay =
    phase !== "hidden" && typeof document !== "undefined"
      ? createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Check-in celebration"
            onClick={dismiss}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(0,0,0,0.72)",
            }}
            className={phase === "in" ? "campfire-backdrop-in" : "campfire-backdrop-out"}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className={`flex flex-col items-center gap-5 rounded-2xl border border-purple/40 bg-surface p-10 shadow-2xl ${
                phase === "in" ? "campfire-card-in" : "campfire-card-out"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={CAMPFIRE_GIF}
                alt="campfire celebration"
                className="h-56 w-56 object-contain"
              />
              <p className="font-mono text-[12px] uppercase tracking-[0.25em] text-purple">
                Checked in — keep the fire burning
              </p>
              <p className="font-mono text-[10px] text-muted2">
                click anywhere to dismiss
              </p>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      {overlay}

      <div className="flex justify-center items-center gap-3">
        <button
          type="button"
          disabled={pending || checkedIn}
          onClick={handleClick}
          className={`rounded-xl px-6 py-3 font-mono text-[11px] uppercase tracking-widest transition-colors duration-200 ${
            checkedIn
              ? "border border-purple bg-purple/20 text-purple"
              : "border border-border2 bg-surface2 text-muted2 hover:border-purple hover:text-purple"
          } disabled:cursor-default`}
        >
          {checkedIn ? "✓ Checked in" : pending ? "Checking in…" : "Check In"}
        </button>

        {error && (
          <p className="text-xs text-coral" role="alert">
            {error}
          </p>
        )}
      </div>
    </>
  );
}

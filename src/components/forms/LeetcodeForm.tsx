'use client';

import { useTransition } from 'react';
import { upsertLeetcodeForm } from '@/app/actions/leetcode';
import { useToast } from '@/lib/toast-context';

type Props = {
  date: string;
  easyCount?: number;
  mediumCount?: number;
  hardCount?: number;
  notes?: string | null;
};

export function LeetcodeForm({ date, easyCount = 0, mediumCount = 0, hardCount = 0, notes }: Props) {
  const [isPending, startTransition] = useTransition();
  const { addToast } = useToast();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        await upsertLeetcodeForm(formData);
        addToast('LeetCode log saved', 'success');
      } catch (err) {
        addToast('Failed to save LeetCode log', 'error');
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 grid gap-3 sm:grid-cols-4 sm:items-end">
      <input type="hidden" name="date" value={date} />
      <label className="flex flex-col gap-1 text-xs text-muted2 ">
        Easy
        <input
          type="number"
          name="easyCount"
          min={0}
          defaultValue={easyCount}
          className="w-full"
          disabled={isPending}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-muted2 ">
        Medium
        <input
          type="number"
          name="mediumCount"
          min={0}
          defaultValue={mediumCount}
          className="w-full"
          disabled={isPending}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-muted2 ">
        Hard
        <input
          type="number"
          name="hardCount"
          min={0}
          defaultValue={hardCount}
          className="w-full"
          disabled={isPending}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-muted2 sm:col-span-4">
        Notes
        <input
          type="text"
          name="notes"
          placeholder="Optional"
          defaultValue={notes ?? ''}
          disabled={isPending}
        />
      </label>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg border border-border2 bg-surface2 px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-muted2 transition-colors hover:border-purple hover:text-purple disabled:opacity-50 disabled:cursor-default"
      >
        {isPending ? 'Saving…' : 'Save'}
      </button>
    </form>
  );
}

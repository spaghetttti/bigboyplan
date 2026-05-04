'use client';

import { useTransition } from 'react';
import { upsertJournalEntryForm } from '@/app/actions/journal';
import { useToast } from '@/lib/toast-context';

type Props = {
  date: string;
  defaultContent?: string;
};

export function JournalForm({ date, defaultContent }: Props) {
  const [isPending, startTransition] = useTransition();
  const { addToast } = useToast();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        await upsertJournalEntryForm(formData);
        addToast('Journal saved', 'success');
        (e.currentTarget as HTMLFormElement).reset();
      } catch (err) {
        addToast('Failed to save journal', 'error');
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3">
      <input type="hidden" name="date" value={date} />
      <textarea
        name="content"
        rows={3}
        className="w-full"
        placeholder="What did you work on today?"
        defaultValue={defaultContent ?? ''}
        disabled={isPending}
      />
      <button
        type="submit"
        disabled={isPending}
        className="mt-2 rounded-lg border border-border2 bg-surface2 px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-muted2 transition-colors hover:border-purple hover:text-purple disabled:opacity-50 disabled:cursor-default"
      >
        {isPending ? 'Saving…' : 'Save journal'}
      </button>
    </form>
  );
}

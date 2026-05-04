'use client';

import { useTransition } from 'react';
import { addTaskForm } from '@/app/actions/tasks';
import { useToast } from '@/lib/toast-context';
import { MultiTagPicker } from '@/components/MultiTagPicker';
import type { CategoryRow } from '@/lib/categories';

type Props = {
  categories: CategoryRow[];
};

export function RecurringTaskForm({ categories }: Props) {
  const [isPending, startTransition] = useTransition();
  const { addToast } = useToast();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        await addTaskForm(formData);
        addToast('Recurring task added', 'success');
        (e.currentTarget as HTMLFormElement).reset();
      } catch (err) {
        addToast('Failed to add recurring task', 'error');
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex flex-wrap gap-2 items-end">
      <input type="hidden" name="isRecurring" value="on" />
      <label className="flex flex-col gap-1 text-xs text-muted2">
        Title
        <input
          type="text"
          name="title"
          placeholder="e.g. Morning review"
          required
          className="w-48"
          disabled={isPending}
        />
      </label>
      <div className="flex flex-col gap-1 text-xs text-muted2">
        Category
        <MultiTagPicker categories={categories} name="categoryIds" />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg border border-border2 bg-surface2 px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-muted2 transition-colors hover:border-purple hover:text-purple disabled:opacity-50 disabled:cursor-default"
      >
        {isPending ? 'Adding…' : 'Add recurring'}
      </button>
    </form>
  );
}

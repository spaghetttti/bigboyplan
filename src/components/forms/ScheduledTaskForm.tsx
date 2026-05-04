'use client';

import { useTransition } from 'react';
import { addTaskForm } from '@/app/actions/tasks';
import { useToast } from '@/lib/toast-context';
import { MultiTagPicker } from '@/components/MultiTagPicker';
import { todayISO } from '@/lib/dates';
import type { CategoryRow } from '@/lib/categories';

type Props = {
  categories: CategoryRow[];
};

export function ScheduledTaskForm({ categories }: Props) {
  const [isPending, startTransition] = useTransition();
  const { addToast } = useToast();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        await addTaskForm(formData);
        addToast('Task scheduled', 'success');
        (e.currentTarget as HTMLFormElement).reset();
        (e.currentTarget as HTMLFormElement).querySelector('input[name="dueDate"]')?.setAttribute('value', todayISO());
      } catch (err) {
        addToast('Failed to schedule task', 'error');
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 grid gap-2 rounded-xl border border-border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-5"
    >
      <input type="hidden" name="isRecurring" value="" />
      <input type="date" name="dueDate" defaultValue={todayISO()} required disabled={isPending} />
      <input
        type="text"
        name="title"
        placeholder="Task title"
        required
        className="lg:col-span-2"
        disabled={isPending}
      />
      <MultiTagPicker categories={categories} name="categoryIds" />
      <button
        type="submit"
        disabled={isPending}
        className="rounded border border-border2 px-3 py-2 font-mono text-[11px] uppercase text-muted2 hover:border-purple hover:text-purple disabled:opacity-50 disabled:cursor-default"
      >
        {isPending ? 'Adding…' : 'Add task'}
      </button>
    </form>
  );
}

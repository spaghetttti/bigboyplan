'use client';

import { useTransition } from 'react';
import { addTaskForm } from '@/app/actions/tasks';
import { useToast } from '@/lib/toast-context';
import { MultiTagPicker } from '@/components/MultiTagPicker';
import type { CategoryRow } from '@/lib/categories';

type Props = {
  categories: CategoryRow[];
  formRef?: React.Ref<HTMLFormElement>;
};

export function TaskForm({ categories, formRef }: Props) {
  const [isPending, startTransition] = useTransition();
  const { addToast } = useToast();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        await addTaskForm(formData);
        addToast('Task created', 'success');
        (e.currentTarget as HTMLFormElement).reset();
      } catch (err) {
        addToast('Failed to create task', 'error');
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="mt-4 flex flex-wrap gap-2 items-end">
      <label className="flex flex-col gap-1">
        <span className="text-[10px] font-mono uppercase tracking-wider text-muted2">Title</span>
        <input
          type="text"
          name="title"
          placeholder="New task"
          className="w-48"
          disabled={isPending}
          autoFocus
        />
      </label>

      <label className="flex items-center gap-2 text-[11px] text-muted2">
        <input type="checkbox" name="isRecurring" disabled={isPending} />
        Recurring
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-[10px] font-mono uppercase tracking-wider text-muted2">Due date (if scheduled)</span>
        <input type="date" name="dueDate" disabled={isPending} />
      </label>

      <div className="w-full">
        <p className="mb-2 text-[10px] font-mono uppercase tracking-wider text-muted2">Tags</p>
        <MultiTagPicker name="categoryIds" categories={categories} />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg border border-border2 bg-surface2 px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-muted2 transition-colors hover:border-purple hover:text-purple disabled:opacity-50 disabled:cursor-default"
      >
        {isPending ? 'Creating…' : '+ Add task'}
      </button>
    </form>
  );
}

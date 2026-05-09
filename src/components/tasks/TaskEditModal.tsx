"use client";

import { useTransition } from "react";
import { updateTaskForm, deleteTaskAction } from "@/app/actions/tasks";
import { MultiTagPicker } from "@/components/MultiTagPicker";
import { useToast } from "@/lib/toast-context";
import type { TaskWithTags } from "@/lib/tasks";
import type { CategoryRow } from "@/lib/categories";

type Props = {
  task: TaskWithTags;
  categories: CategoryRow[];
  onClose: () => void;
};

export function TaskEditModal({ task, categories, onClose }: Props) {
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const { addToast } = useToast();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await updateTaskForm(task.id, formData);
        addToast("Task updated", "success");
        onClose();
      } catch {
        addToast("Failed to update task", "error");
      }
    });
  }

  function handleDelete() {
    startDeleteTransition(async () => {
      try {
        await deleteTaskAction(task.id);
        addToast("Task deleted", "success");
        onClose();
      } catch {
        addToast("Failed to delete task", "error");
      }
    });
  }

  const defaultCategoryIds = task.taskTags.map((tt) => tt.categoryId);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted2">
            Edit task
          </p>
          <button
            type="button"
            onClick={onClose}
            className="font-mono text-[12px] text-muted2 hover:text-text"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="text"
            name="title"
            defaultValue={task.title}
            placeholder="Task title"
            required
            disabled={isPending}
            className="w-full"
          />

          <input
            type="date"
            name="dueDate"
            defaultValue={task.dueDate ?? ""}
            disabled={isPending}
            className="w-full"
          />

          <textarea
            name="notes"
            defaultValue={task.notes ?? ""}
            placeholder="Notes (optional)"
            rows={3}
            disabled={isPending}
            className="w-full resize-none"
          />

          <MultiTagPicker
            categories={categories}
            name="categoryIds"
            defaultSelected={defaultCategoryIds}
          />

          <div className="mt-1 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting || isPending}
              className="rounded border border-border2 px-3 py-2 font-mono text-[11px] uppercase text-coral hover:border-coral disabled:opacity-40 disabled:cursor-default"
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="rounded border border-border2 px-3 py-2 font-mono text-[11px] uppercase text-muted2 hover:border-border hover:text-text disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="rounded border border-border2 px-3 py-2 font-mono text-[11px] uppercase text-muted2 hover:border-purple hover:text-purple disabled:opacity-40 disabled:cursor-default"
              >
                {isPending ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

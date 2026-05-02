"use client";

import { useState } from "react";
import type { CategoryRow } from "@/lib/categories";

type Props = {
  categories: CategoryRow[];
  /** Form field name — `formData.getAll(name)` returns selected category IDs. */
  name: string;
  /** Pre-selected category IDs. */
  defaultSelected?: string[];
};

export function MultiTagPicker({ categories, name, defaultSelected = [] }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set(defaultSelected));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="flex flex-wrap gap-1.5" role="group">
      {/* Hidden inputs carry selected values into the enclosing <form> */}
      {Array.from(selected).map((id) => (
        <input key={id} type="hidden" name={name} value={id} />
      ))}

      {categories.map((cat) => {
        const on = selected.has(cat.id);
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => toggle(cat.id)}
            style={on ? { borderColor: cat.color, color: cat.color, background: `${cat.color}18` } : undefined}
            className={`rounded border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider transition-colors ${
              on
                ? "border-current"
                : "border-border2 text-muted2  hover:border-muted hover:text-muted2 "
            }`}
          >
            {cat.name}
          </button>
        );
      })}
    </div>
  );
}

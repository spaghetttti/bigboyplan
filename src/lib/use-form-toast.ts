import { useTransition } from 'react';
import { useToast } from '@/lib/toast-context';

export function useFormToast(
  action: (formData: FormData) => Promise<{ ok: boolean; error?: string }>,
  options?: {
    successMessage?: string;
    errorMessage?: string;
  }
) {
  const [isPending, startTransition] = useTransition();
  const { addToast } = useToast();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await action(formData);
      if (result.ok) {
        addToast(options?.successMessage ?? 'Saved successfully', 'success');
        e.currentTarget.reset?.();
      } else {
        addToast(result.error ?? options?.errorMessage ?? 'Something went wrong', 'error');
      }
    });
  };

  return { handleSubmit, isPending };
}

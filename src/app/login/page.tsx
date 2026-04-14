import { signIn } from "@/auth";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-6">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-purple">
          DevTrack
        </p>
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-text">
          Track the grind.
        </h1>
        <p className="mt-2 text-sm text-muted2">
          Sign in with GitHub to sync your progress.
        </p>
        <form
          className="mt-8"
          action={async () => {
            "use server";
            await signIn("github", { redirectTo: "/dashboard" });
          }}
        >
          <Button type="submit" className="h-10 w-full" variant="default">
            Continue with GitHub
          </Button>
        </form>
      </div>
    </div>
  );
}

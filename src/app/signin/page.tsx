import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { Button } from "@/components/ui";

export const metadata = { title: "Sign in" };

export default async function SignInPage() {
  if ((await auth())?.user) redirect("/");
  return (
    <main className="grid min-h-dvh place-items-center p-6">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <div>
          <h1 className="text-2xl font-semibold">TagAutoList</h1>
          <p className="mt-1 text-sm text-muted">Everything is a tag. Simple lists on top.</p>
        </div>
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
        >
          <Button type="submit" className="w-full">
            Continue with Google
          </Button>
        </form>
      </div>
    </main>
  );
}

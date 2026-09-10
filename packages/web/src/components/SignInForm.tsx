import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useClient } from "@/lib/client-context";
import { useSession } from "@/lib/session";

/**
 * Email + password sign-in / sign-up.
 *
 * Sign-up also collects `name`. Failed auth shows the error string under
 * the fields.
 */
export function SignInForm() {
  const client = useClient();
  const { setViewer } = useSession();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  /**
   * Submit credentials to `sign-in` or `sign-up`.
   *
   * @param event Native form submit event.
   */
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const name = String(formData.get("name") ?? "");
    try {
      const user =
        flow === "signIn"
          ? await client.signIn.execute({ email, password })
          : await client.signUp.execute({ email, password, name });
      setViewer(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not authenticate.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Clean Chat</CardTitle>
          <CardDescription>
            {flow === "signIn"
              ? "Sign in to join the realtime rooms."
              : "Create an account to start chatting."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={onSubmit}>
            {flow === "signUp" ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Display name</Label>
                <Input
                  id="name"
                  name="name"
                  autoComplete="nickname"
                  required
                  placeholder="Ada"
                />
              </div>
            ) : null}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="ada@example.com"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete={
                  flow === "signIn" ? "current-password" : "new-password"
                }
                required
                minLength={8}
                placeholder="At least 8 characters"
              />
            </div>
            <input name="flow" type="hidden" value={flow} />
            {error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : null}
            <Button type="submit" disabled={submitting}>
              {submitting
                ? "Working…"
                : flow === "signIn"
                  ? "Sign in"
                  : "Create account"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setError(null);
                setFlow(flow === "signIn" ? "signUp" : "signIn");
              }}
            >
              {flow === "signIn"
                ? "Need an account? Sign up"
                : "Already have an account? Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

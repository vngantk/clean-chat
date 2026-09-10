import { ChatApp } from "@/components/ChatApp";
import { SignInForm } from "@/components/SignInForm";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/session";

/**
 * Auth gate for the SPA. Session still resolving → loading copy;
 * signed out → auth card; signed in → chat shell. A failed session
 * fetch that is not “no user” shows retry instead of the auth card.
 */
export default function App() {
  const { viewer, sessionError, retry } = useSession();

  if (viewer === undefined && sessionError !== undefined) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
        <p>{sessionError}</p>
        <Button variant="outline" size="sm" onClick={retry}>
          Retry
        </Button>
      </div>
    );
  }

  if (viewer === undefined) {
    return (
      <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">
        Loading session…
      </div>
    );
  }

  if (viewer === null) {
    return <SignInForm />;
  }

  return <ChatApp />;
}

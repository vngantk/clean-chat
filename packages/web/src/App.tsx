import { ChatApp } from "@/components/ChatApp";
import { SignInForm } from "@/components/SignInForm";
import { useSession } from "@/lib/session";

/**
 * Auth gate for the SPA. Session still resolving → loading copy;
 * signed out → auth card; signed in → chat shell.
 */
export default function App() {
  const { viewer } = useSession();

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

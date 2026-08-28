import { KeyRound } from "lucide-react";

/** Shown when the VITE_FIREBASE_* environment variables are missing. */
export function FirebaseSetupNotice() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="surface max-w-lg p-8">
        <KeyRound className="size-6 text-primary" />
        <h1 className="mt-3 text-xl font-semibold">Connect your Firebase project</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          HealthGuardian AI uses your existing Firebase project. Add these environment variables
          (see
          <code className="mx-1 rounded bg-muted px-1">.env.example</code>) and reload:
        </p>
        <ul className="mt-3 space-y-1 font-mono text-xs text-muted-foreground">
          <li>VITE_FIREBASE_API_KEY</li>
          <li>VITE_FIREBASE_AUTH_DOMAIN</li>
          <li>VITE_FIREBASE_PROJECT_ID</li>
          <li>VITE_FIREBASE_MESSAGING_SENDER_ID</li>
          <li>VITE_FIREBASE_APP_ID</li>
        </ul>
        <p className="mt-4 text-xs text-muted-foreground">
          Keys are never hardcoded in the source. The rest of the interface stays available once
          Firebase is reachable.
        </p>
      </div>
    </div>
  );
}

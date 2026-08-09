import { useAppContext } from "../context/AppContext";
import { Button, Card, Field, inputCls } from "./ui";

export default function AuthScreen() {
  const {
    authError,
    authMode,
    handleLogin,
    handleRegister,
    setAuthMode,
  } = useAppContext();

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md p-8">
        <div className="mb-6 text-center">
          <div className="flex items-center justify-center gap-2">
            <img src="/favicon.png" className="h-8 w-8 rounded-full" alt="Crucible logo" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Crucible.</h1>
          </div>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {authMode === "login" ? "Sign in to start a brainstorm." : "Create an account to start brainstorming."}
          </p>
        </div>

        <form onSubmit={authMode === "login" ? handleLogin : handleRegister} className="space-y-4">
          <Field label="Username" required>
            <input className={inputCls} type="text" name="username" required placeholder="Your username" autoComplete="username" />
          </Field>
          {authMode === "register" && (
            <Field label="Email" required>
              <input className={inputCls} type="email" name="email" required placeholder="you@example.com" autoComplete="email" />
            </Field>
          )}
          <Field label="Password" required>
            <input className={inputCls} type="password" name="password" required placeholder="Your password" autoComplete="current-password" />
          </Field>

          {authError && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
              {authError}
            </div>
          )}

          <Button type="submit" className="w-full">
            {authMode === "login" ? "Sign in" : "Create account"}
          </Button>
        </form>

        <div className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
          {authMode === "login" ? (
            <>
              New here?{" "}
              <button onClick={() => setAuthMode("register")} className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
                Create an account
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button onClick={() => setAuthMode("login")} className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
                Sign in
              </button>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}

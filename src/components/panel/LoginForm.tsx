"use client";

import { useActionState } from "react";
import { login } from "@/app/panel/actions";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<{ error?: string }, FormData>(
    login,
    {},
  );

  return (
    <form action={formAction}>
      {state?.error && (
        <p className="panel-error" role="alert">
          {state.error}
        </p>
      )}

      <div className="field">
        <label htmlFor="user">Login</label>
        <input id="user" name="user" type="text" autoComplete="username" required />
      </div>

      <div className="field">
        <label htmlFor="password">Hasło</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>

      <button className="btn btn-primary" type="submit" disabled={pending}>
        {pending ? "Sprawdzam…" : "Zaloguj"}
      </button>
    </form>
  );
}

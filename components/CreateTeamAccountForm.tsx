"use client";

import { useActionState } from "react";
import { createTeamAccount, type CreateTeamAccountState } from "@/lib/adminActions";

const initialState: CreateTeamAccountState = { password: null, accountName: null, error: null };

export default function CreateTeamAccountForm() {
  const [state, formAction, pending] = useActionState(createTeamAccount, initialState);

  return (
    <div>
      <form action={formAction} className="grid sm:grid-cols-3 gap-2 items-end">
        <label className="text-xs text-mid-gray">
          Name
          <input name="name" required className="mt-1 w-full rounded-full border border-tan px-3 py-1.5 text-sm bg-warm-beige" />
        </label>
        <label className="text-xs text-mid-gray">
          Email
          <input name="email" type="email" required className="mt-1 w-full rounded-full border border-tan px-3 py-1.5 text-sm bg-warm-beige" />
        </label>
        <label className="text-xs text-mid-gray">
          Role
          <select name="role" defaultValue="manager" className="mt-1 w-full rounded-full border border-tan px-3 py-1.5 text-sm bg-warm-beige">
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
            <option value="staff">Staff</option>
          </select>
        </label>
        <button
          disabled={pending}
          className="rounded-full bg-charcoal text-off-white px-4 py-2 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 sm:col-span-3 sm:w-fit"
        >
          {pending ? "Creating…" : "Create account"}
        </button>
      </form>
      {state.error && <p className="mt-2 text-xs text-vitality-orange">{state.error}</p>}
      {state.password && (
        <p className="mt-2 text-xs bg-warm-amber/20 border border-warm-amber rounded-lg px-3 py-2 inline-block">
          New login for {state.accountName}: email as entered, password{" "}
          <span className="font-mono font-semibold">{state.password}</span>
          <br />
          Write it down now — it won&apos;t be shown again.
        </p>
      )}
    </div>
  );
}

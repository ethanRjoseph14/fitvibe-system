"use client";

import { useActionState } from "react";
import { resetMemberPassword, type ResetPasswordState } from "@/lib/adminActions";

const initialState: ResetPasswordState = { password: null, memberName: null, error: null };

export default function ResetPasswordButton({
  memberId,
  memberName,
}: {
  memberId: string;
  memberName: string;
}) {
  const [state, formAction, pending] = useActionState(resetMemberPassword, initialState);

  return (
    <div className="flex flex-col items-end gap-1">
      <form action={formAction}>
        <input type="hidden" name="memberId" value={memberId} />
        <input type="hidden" name="memberName" value={memberName} />
        <button
          disabled={pending}
          className="text-xs font-semibold text-evergreen hover:underline disabled:opacity-50 whitespace-nowrap"
        >
          {pending ? "Generating…" : "Set/reset password"}
        </button>
      </form>
      {state.password && (
        <p className="text-xs bg-warm-amber/20 border border-warm-amber rounded-lg px-2 py-1.5 text-charcoal max-w-[220px] text-right">
          New password for {state.memberName}:{" "}
          <span className="font-mono font-semibold break-all">{state.password}</span>
          <br />
          Write it down now — it won&apos;t be shown again.
        </p>
      )}
    </div>
  );
}

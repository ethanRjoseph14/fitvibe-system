"use client";

import { useState } from "react";
import { deleteMember } from "@/lib/adminActions";

/**
 * Deletes a member and everything tied to them (bookings, credit packs,
 * payments, access history, progress check-ins) — permanent, no undo.
 * Requires typing the member's exact name before the confirm button
 * enables, as a guard against an accidental click on real member data.
 */
export default function DeleteMemberButton({
  memberId,
  memberName,
}: {
  memberId: string;
  memberName: string;
}) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs font-semibold text-vitality-orange hover:underline"
      >
        Delete
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-vitality-orange bg-warm-amber/10 p-2 text-xs space-y-1.5 w-56">
      <p className="text-charcoal">
        Type <span className="font-mono font-semibold">{memberName}</span> to permanently
        delete this member and all their history.
      </p>
      <input
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        autoFocus
        className="w-full rounded-full border border-tan px-2 py-1 text-xs bg-warm-beige"
      />
      <div className="flex items-center gap-3">
        <form action={deleteMember}>
          <input type="hidden" name="memberId" value={memberId} />
          <button
            type="submit"
            disabled={confirmText !== memberName}
            className="rounded-full bg-vitality-orange text-charcoal px-3 py-1 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Confirm delete
          </button>
        </form>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setConfirmText("");
          }}
          className="text-mid-gray hover:underline"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

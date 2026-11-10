"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/shared/submit-button";
import { EMPTY_ACTION_STATE } from "@/lib/errors";
import { USER_ROLES, ROLE_LABELS } from "@/lib/roles";
import { updateUserRoleAction } from "@/modules/settings/actions";

export function UserRoleForm({ userId, role }: { userId: string; role: string }) {
  const [state, formAction] = useActionState(updateUserRoleAction, EMPTY_ACTION_STATE);

  return (
    <form action={formAction} className="flex items-center justify-end gap-2">
      <input type="hidden" name="id" value={userId} />
      <select
        name="role"
        defaultValue={role}
        className="h-7 rounded-lg border border-input bg-transparent px-2 text-xs dark:bg-input/30"
      >
        {USER_ROLES.map((value) => (
          <option key={value} value={value}>{ROLE_LABELS[value]}</option>
        ))}
      </select>
      <SubmitButton size="xs" variant="outline">保存</SubmitButton>
      {!state.ok && state.error ? <span className="text-xs text-destructive">{state.error}</span> : null}
    </form>
  );
}
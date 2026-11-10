"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/shared/submit-button";
import { EMPTY_ACTION_STATE, type ActionState } from "@/lib/errors";

type ActionButtonFormProps = {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  fields: Record<string, string>;
  label: string;
  variant?: "default" | "outline" | "secondary" | "ghost" | "destructive" | "link";
  size?: "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg";
  confirmMessage?: string;
};

export function ActionButtonForm({
  action,
  fields,
  label,
  variant = "default",
  size = "sm",
  confirmMessage,
}: ActionButtonFormProps) {
  const [state, formAction] = useActionState(action, EMPTY_ACTION_STATE);

  return (
    <form
      action={formAction}
      className="inline-flex flex-col items-end gap-1"
      onSubmit={(event) => {
        if (confirmMessage && !window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
    >
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <SubmitButton variant={variant} size={size}>
        {label}
      </SubmitButton>
      {!state.ok && state.error ? (
        <span className="max-w-52 text-right text-xs text-destructive">{state.error}</span>
      ) : null}
    </form>
  );
}
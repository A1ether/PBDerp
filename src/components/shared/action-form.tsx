"use client";

import { AlertCircle } from "lucide-react";
import { useActionState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SubmitButton } from "@/components/shared/submit-button";
import { EMPTY_ACTION_STATE, type ActionState } from "@/lib/errors";
import { cn } from "@/lib/utils";

export type FormAction = (state: ActionState, formData: FormData) => Promise<ActionState>;

export function ActionForm({
  action,
  children,
  submitLabel = "保存",
  cancel,
  className,
  submitVariant = "default",
}: {
  action: FormAction;
  children: React.ReactNode;
  submitLabel?: string;
  cancel?: React.ReactNode;
  className?: string;
  submitVariant?: "default" | "outline" | "secondary" | "ghost" | "destructive" | "link";
}) {
  const [state, formAction] = useActionState(action, EMPTY_ACTION_STATE);
  const fieldErrors = state.ok ? [] : Object.entries(state.fieldErrors ?? {});

  return (
    <form action={formAction} className={cn("space-y-5", className)}>
      {!state.ok && state.error ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>无法保存</AlertTitle>
          <AlertDescription>
            <p>{state.error}</p>
            {fieldErrors.length > 0 ? (
              <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">
                {fieldErrors.map(([field, messages]) => (
                  <li key={field}>
                    <span className="font-medium">{field}</span>：{messages.join("，")}
                  </li>
                ))}
              </ul>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      {children}

      <div className="flex items-center justify-end gap-2 pt-2">
        {cancel}
        <SubmitButton variant={submitVariant}>{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
"use client";

import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ConfirmSubmitButton({
  action,
  confirmMessage,
  children = "删除",
  variant = "destructive",
  size = "sm",
}: {
  action: (formData: FormData) => void | Promise<void>;
  confirmMessage: string;
  children?: React.ReactNode;
  variant?: "default" | "outline" | "secondary" | "ghost" | "destructive" | "link";
  size?: "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg";
}) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
    >
      <Button type="submit" variant={variant} size={size}>
        <Trash2 className="size-3.5" />
        {children}
      </Button>
    </form>
  );
}
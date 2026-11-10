export type AppErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "CONFLICT"
  | "INSUFFICIENT_STOCK"
  | "INVALID_STATE"
  | "RESERVATION_MISMATCH"
  | "DATABASE_ERROR";

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly fieldErrors?: Record<string, string[]>;
  readonly status: number;

  constructor(
    code: AppErrorCode,
    message: string,
    options?: { fieldErrors?: Record<string, string[]>; status?: number; cause?: unknown },
  ) {
    super(message, { cause: options?.cause });
    this.name = "AppError";
    this.code = code;
    this.fieldErrors = options?.fieldErrors;
    this.status = options?.status ?? statusForCode(code);
  }
}

function statusForCode(code: AppErrorCode): number {
  switch (code) {
    case "UNAUTHORIZED":
      return 401;
    case "FORBIDDEN":
      return 403;
    case "NOT_FOUND":
      return 404;
    case "VALIDATION_ERROR":
      return 422;
    case "INSUFFICIENT_STOCK":
    case "INVALID_STATE":
    case "CONFLICT":
    case "RESERVATION_MISMATCH":
      return 409;
    default:
      return 500;
  }
}

export type ActionState =
  | { ok: true; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export const EMPTY_ACTION_STATE: ActionState = { ok: false, error: "" };

export function toActionError(error: unknown): ActionState {
  if (error instanceof AppError) {
    return {
      ok: false,
      error: error.message,
      fieldErrors: error.fieldErrors,
    };
  }

  console.error("[action] unexpected error", error);
  return {
    ok: false,
    error: "操作失败，请稍后重试。如持续出现，请联系管理员。",
  };
}

export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}
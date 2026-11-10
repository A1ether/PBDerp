import "server-only";

import { randomUUID } from "node:crypto";

import type { DocumentType, Prisma } from "@/generated/prisma/client";

const PREFIX: Record<DocumentType, string> = {
  SALES_ORDER: "SO",
  PURCHASE_ORDER: "PO",
  SHIPMENT: "SHP",
  GOODS_RECEIPT: "GRN",
  STOCK_TRANSFER: "TRF",
};

type QueryClient = Pick<Prisma.TransactionClient, "$queryRaw">;

/**
 * Generates a document number inside the caller's transaction.
 * Uses INSERT ... ON CONFLICT DO UPDATE so concurrent callers never reuse a number.
 */
export async function nextDocumentNo(
  tx: QueryClient,
  organizationId: string,
  type: DocumentType,
  date = new Date(),
): Promise<string> {
  const period = String(date.getFullYear());
  const prefix = PREFIX[type];

  const rows = await tx.$queryRaw<{ lastNumber: number }[]>`
    INSERT INTO "DocumentSequence"
      ("id", "organizationId", "type", "period", "prefix", "lastNumber", "createdAt", "updatedAt")
    VALUES
      (${randomUUID()}, ${organizationId}, ${type}::"DocumentType", ${period}, ${prefix}, 1, now(), now())
    ON CONFLICT ("organizationId", "type", "period")
    DO UPDATE SET
      "lastNumber" = "DocumentSequence"."lastNumber" + 1,
      "updatedAt" = now()
    RETURNING "lastNumber"
  `;

  const sequence = rows[0]?.lastNumber;
  if (!sequence) {
    throw new Error("无法生成单据编号");
  }

  return `${prefix}-${period}-${String(sequence).padStart(4, "0")}`;
}
-- CreateEnum
CREATE TYPE "SalesReturnStatus" AS ENUM ('DRAFT', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "StockTakeStatus" AS ENUM ('DRAFT', 'COMPLETED', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DocumentType" ADD VALUE 'SALES_RETURN';
ALTER TYPE "DocumentType" ADD VALUE 'STOCK_TAKE';

-- AlterEnum
ALTER TYPE "PaymentReferenceType" ADD VALUE 'SALES_RETURN';

-- AlterEnum
ALTER TYPE "SalesOrderStatus" ADD VALUE 'PARTIALLY_SHIPPED';

-- AlterTable
ALTER TABLE "SalesOrderLine" ADD COLUMN     "returnedQuantity" DECIMAL(18,4) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "SalesReturn" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "returnNo" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "status" "SalesReturnStatus" NOT NULL DEFAULT 'DRAFT',
    "reason" TEXT,
    "refundAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "receivedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesReturn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesReturnLine" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "returnId" TEXT NOT NULL,
    "orderLineId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "unitPrice" DECIMAL(18,4) NOT NULL,
    "lineTotal" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "SalesReturnLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockTake" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "takeNo" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "status" "StockTakeStatus" NOT NULL DEFAULT 'DRAFT',
    "note" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockTake_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockTakeLine" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "stockTakeId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "systemQuantity" DECIMAL(18,4) NOT NULL,
    "countedQuantity" DECIMAL(18,4) NOT NULL,
    "difference" DECIMAL(18,4) NOT NULL,

    CONSTRAINT "StockTakeLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SalesReturn_organizationId_status_createdAt_idx" ON "SalesReturn"("organizationId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "SalesReturn_organizationId_orderId_idx" ON "SalesReturn"("organizationId", "orderId");

-- CreateIndex
CREATE UNIQUE INDEX "SalesReturn_organizationId_returnNo_key" ON "SalesReturn"("organizationId", "returnNo");

-- CreateIndex
CREATE INDEX "SalesReturnLine_returnId_idx" ON "SalesReturnLine"("returnId");

-- CreateIndex
CREATE INDEX "SalesReturnLine_orderLineId_idx" ON "SalesReturnLine"("orderLineId");

-- CreateIndex
CREATE INDEX "StockTake_organizationId_status_createdAt_idx" ON "StockTake"("organizationId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "StockTake_organizationId_warehouseId_idx" ON "StockTake"("organizationId", "warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "StockTake_organizationId_takeNo_key" ON "StockTake"("organizationId", "takeNo");

-- CreateIndex
CREATE INDEX "StockTakeLine_stockTakeId_idx" ON "StockTakeLine"("stockTakeId");

-- CreateIndex
CREATE INDEX "StockTakeLine_variantId_idx" ON "StockTakeLine"("variantId");

-- AddForeignKey
ALTER TABLE "SalesReturn" ADD CONSTRAINT "SalesReturn_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "SalesOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesReturn" ADD CONSTRAINT "SalesReturn_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesReturn" ADD CONSTRAINT "SalesReturn_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesReturnLine" ADD CONSTRAINT "SalesReturnLine_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "SalesReturn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesReturnLine" ADD CONSTRAINT "SalesReturnLine_orderLineId_fkey" FOREIGN KEY ("orderLineId") REFERENCES "SalesOrderLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesReturnLine" ADD CONSTRAINT "SalesReturnLine_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTake" ADD CONSTRAINT "StockTake_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTake" ADD CONSTRAINT "StockTake_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTakeLine" ADD CONSTRAINT "StockTakeLine_stockTakeId_fkey" FOREIGN KEY ("stockTakeId") REFERENCES "StockTake"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTakeLine" ADD CONSTRAINT "StockTakeLine_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTakeLine" ADD CONSTRAINT "StockTakeLine_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "WarehouseLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

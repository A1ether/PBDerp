-- CreateEnum
CREATE TYPE "ChannelType" AS ENUM ('CUSTOM', 'SHOPIFY', 'TIKTOK_SHOP', 'TAOBAO', 'JD', 'DOUYIN');

-- CreateEnum
CREATE TYPE "ChannelOrderStatus" AS ENUM ('IMPORTED', 'FAILED');

-- CreateTable
CREATE TABLE "Channel" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" "ChannelType" NOT NULL DEFAULT 'CUSTOM',
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "config" JSONB,
    "status" "ActiveStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Channel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannelOrder" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "externalOrderNo" TEXT NOT NULL,
    "salesOrderId" TEXT,
    "rawPayload" JSONB,
    "status" "ChannelOrderStatus" NOT NULL DEFAULT 'IMPORTED',
    "errorMessage" TEXT,
    "importedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChannelOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Channel_organizationId_status_idx" ON "Channel"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Channel_organizationId_code_key" ON "Channel"("organizationId", "code");

-- CreateIndex
CREATE INDEX "ChannelOrder_organizationId_status_idx" ON "ChannelOrder"("organizationId", "status");

-- CreateIndex
CREATE INDEX "ChannelOrder_organizationId_salesOrderId_idx" ON "ChannelOrder"("organizationId", "salesOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "ChannelOrder_channelId_externalOrderNo_key" ON "ChannelOrder"("channelId", "externalOrderNo");

-- AddForeignKey
ALTER TABLE "ChannelOrder" ADD CONSTRAINT "ChannelOrder_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelOrder" ADD CONSTRAINT "ChannelOrder_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "SalesOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

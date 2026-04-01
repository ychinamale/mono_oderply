-- CreateEnum
CREATE TYPE "PartnerType" AS ENUM ('PANIC_SOURCE', 'RESPONDER_SYSTEM');

-- CreateEnum
CREATE TYPE "PanicStatus" AS ENUM ('PENDING', 'ACKNOWLEDGED', 'DISPATCHED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "LogTrigger" AS ENUM ('OPERATOR', 'PARTNER_CLAIM');

-- CreateTable
CREATE TABLE "Partner" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PartnerType" NOT NULL,
    "apiKeyHash" TEXT NOT NULL,
    "webhookUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PanicEvent" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "claimedByPartnerId" TEXT,
    "externalUserId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "status" "PanicStatus" NOT NULL DEFAULT 'PENDING',
    "idempotencyKey" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PanicEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PanicEventLog" (
    "id" TEXT NOT NULL,
    "panicId" TEXT NOT NULL,
    "triggeredBy" "LogTrigger" NOT NULL,
    "operatorId" TEXT,
    "partnerId" TEXT,
    "fromStatus" "PanicStatus" NOT NULL,
    "toStatus" "PanicStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PanicEventLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Operator" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Operator_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Partner_apiKeyHash_key" ON "Partner"("apiKeyHash");

-- CreateIndex
CREATE UNIQUE INDEX "PanicEvent_idempotencyKey_key" ON "PanicEvent"("idempotencyKey");

-- CreateIndex
CREATE INDEX "PanicEvent_status_idx" ON "PanicEvent"("status");

-- CreateIndex
CREATE INDEX "PanicEvent_partnerId_idx" ON "PanicEvent"("partnerId");

-- CreateIndex
CREATE INDEX "PanicEvent_claimedByPartnerId_idx" ON "PanicEvent"("claimedByPartnerId");

-- CreateIndex
CREATE INDEX "PanicEvent_createdAt_idx" ON "PanicEvent"("createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Operator_email_key" ON "Operator"("email");

-- AddForeignKey
ALTER TABLE "PanicEvent" ADD CONSTRAINT "PanicEvent_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PanicEvent" ADD CONSTRAINT "PanicEvent_claimedByPartnerId_fkey" FOREIGN KEY ("claimedByPartnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PanicEventLog" ADD CONSTRAINT "PanicEventLog_panicId_fkey" FOREIGN KEY ("panicId") REFERENCES "PanicEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PanicEventLog" ADD CONSTRAINT "PanicEventLog_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PanicEventLog" ADD CONSTRAINT "PanicEventLog_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

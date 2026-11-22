CREATE TABLE "AutomationRunRequest" (
    "id" TEXT NOT NULL,
    "automationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "idempotencyKey" TEXT,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "runId" TEXT,
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "AutomationRunRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AutomationRunRequest_userId_idempotencyKey_key"
ON "AutomationRunRequest"("userId", "idempotencyKey");
CREATE INDEX "AutomationRunRequest_status_availableAt_createdAt_idx"
ON "AutomationRunRequest"("status", "availableAt", "createdAt");
CREATE INDEX "AutomationRunRequest_automationId_createdAt_idx"
ON "AutomationRunRequest"("automationId", "createdAt");
CREATE INDEX "AutomationRunRequest_userId_createdAt_idx"
ON "AutomationRunRequest"("userId", "createdAt");

ALTER TABLE "AutomationRunRequest"
ADD CONSTRAINT "AutomationRunRequest_automationId_fkey"
FOREIGN KEY ("automationId") REFERENCES "Automation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AutomationRunRequest"
ADD CONSTRAINT "AutomationRunRequest_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AgentWorkflow" ADD COLUMN "inputFingerprint" TEXT;

CREATE INDEX "AgentWorkflow_userId_inputFingerprint_status_idx"
ON "AgentWorkflow"("userId", "inputFingerprint", "status");

CREATE TYPE "AgentWorkflowType" AS ENUM ('job_match');
CREATE TYPE "AgentWorkflowStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');
CREATE TYPE "AgentStepStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

CREATE TABLE "AgentWorkflow" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "AgentWorkflowType" NOT NULL,
  "status" "AgentWorkflowStatus" NOT NULL DEFAULT 'QUEUED',
  "jobId" TEXT,
  "resumeId" TEXT,
  "idempotencyKey" TEXT,
  "promptVersion" TEXT NOT NULL,
  "attempt" INTEGER NOT NULL DEFAULT 0,
  "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lockedAt" TIMESTAMP(3),
  "lockedBy" TEXT,
  "errorCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "AgentWorkflow_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AgentStep" (
  "id" TEXT NOT NULL,
  "workflowId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "status" "AgentStepStatus" NOT NULL DEFAULT 'QUEUED',
  "attempt" INTEGER NOT NULL DEFAULT 0,
  "provider" TEXT,
  "model" TEXT,
  "inputRef" TEXT,
  "output" TEXT,
  "errorCode" TEXT,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AgentStep_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "JobAnalysis" (
  "id" TEXT NOT NULL,
  "workflowId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "resumeId" TEXT NOT NULL,
  "matchScore" INTEGER NOT NULL,
  "recommendation" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "evidence" TEXT,
  "gaps" TEXT,
  "uncertainty" TEXT,
  "provider" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "promptVersion" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "JobAnalysis_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AgentWorkflow_userId_idempotencyKey_key" ON "AgentWorkflow"("userId", "idempotencyKey");
CREATE INDEX "AgentWorkflow_status_availableAt_createdAt_idx" ON "AgentWorkflow"("status", "availableAt", "createdAt");
CREATE INDEX "AgentWorkflow_userId_createdAt_idx" ON "AgentWorkflow"("userId", "createdAt");
CREATE INDEX "AgentWorkflow_jobId_createdAt_idx" ON "AgentWorkflow"("jobId", "createdAt");
CREATE UNIQUE INDEX "AgentStep_workflowId_position_key" ON "AgentStep"("workflowId", "position");
CREATE INDEX "AgentStep_workflowId_status_idx" ON "AgentStep"("workflowId", "status");
CREATE UNIQUE INDEX "JobAnalysis_workflowId_key" ON "JobAnalysis"("workflowId");
CREATE INDEX "JobAnalysis_userId_createdAt_idx" ON "JobAnalysis"("userId", "createdAt");
CREATE INDEX "JobAnalysis_jobId_createdAt_idx" ON "JobAnalysis"("jobId", "createdAt");
CREATE INDEX "JobAnalysis_resumeId_createdAt_idx" ON "JobAnalysis"("resumeId", "createdAt");

ALTER TABLE "AgentWorkflow" ADD CONSTRAINT "AgentWorkflow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgentWorkflow" ADD CONSTRAINT "AgentWorkflow_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgentWorkflow" ADD CONSTRAINT "AgentWorkflow_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "Resume"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgentStep" ADD CONSTRAINT "AgentStep_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "AgentWorkflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JobAnalysis" ADD CONSTRAINT "JobAnalysis_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "AgentWorkflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JobAnalysis" ADD CONSTRAINT "JobAnalysis_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JobAnalysis" ADD CONSTRAINT "JobAnalysis_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JobAnalysis" ADD CONSTRAINT "JobAnalysis_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "Resume"("id") ON DELETE CASCADE ON UPDATE CASCADE;

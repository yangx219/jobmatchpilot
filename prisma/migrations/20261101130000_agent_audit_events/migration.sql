CREATE TABLE "AgentAuditEvent" (
  "id" TEXT NOT NULL,
  "workflowId" TEXT,
  "action" TEXT NOT NULL,
  "actorType" TEXT NOT NULL,
  "actorId" TEXT,
  "metadata" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AgentAuditEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AgentAuditEvent_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "AgentWorkflow"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "AgentAuditEvent_workflowId_createdAt_id_idx" ON "AgentAuditEvent"("workflowId", "createdAt", "id");

CREATE FUNCTION prevent_agent_audit_mutation() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'UPDATE'
    AND OLD."workflowId" IS NOT NULL
    AND NEW."workflowId" IS NULL
    AND NEW."id" = OLD."id"
    AND NEW."action" = OLD."action"
    AND NEW."actorType" = OLD."actorType"
    AND NEW."actorId" IS NOT DISTINCT FROM OLD."actorId"
    AND NEW."metadata" IS NOT DISTINCT FROM OLD."metadata"
    AND NEW."createdAt" = OLD."createdAt"
  THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Agent audit events are append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "AgentAuditEvent_append_only_update"
BEFORE UPDATE ON "AgentAuditEvent" FOR EACH ROW EXECUTE FUNCTION prevent_agent_audit_mutation();

CREATE TRIGGER "AgentAuditEvent_append_only_delete"
BEFORE DELETE ON "AgentAuditEvent" FOR EACH ROW EXECUTE FUNCTION prevent_agent_audit_mutation();

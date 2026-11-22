import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

try {
  const enumRows = await db.$queryRaw`
    SELECT type.typname AS name, enum.enumlabel AS value
    FROM pg_type AS type
    JOIN pg_enum AS enum ON enum.enumtypid = type.oid
    WHERE type.typname IN ('AgentWorkflowType', 'AgentWorkflowStatus')
    ORDER BY type.typname, enum.enumsortorder
  `;
  const enumValues = new Map();
  for (const row of enumRows) {
    const values = enumValues.get(row.name) ?? [];
    values.push(row.value);
    enumValues.set(row.name, values);
  }

  assert(
    JSON.stringify(enumValues.get("AgentWorkflowType")) ===
      JSON.stringify(["job_match", "cover_letter", "resume_tailor"]),
    "AgentWorkflowType is missing one or more production workflow values",
  );
  assert(
    enumValues.get("AgentWorkflowStatus")?.includes("WAITING_APPROVAL"),
    "AgentWorkflowStatus is missing WAITING_APPROVAL",
  );

  const relations = await db.$queryRaw`
    SELECT to_regclass('"AgentWorkflow"')::text AS workflow,
           to_regclass('"AgentStep"')::text AS step,
           to_regclass('"JobAnalysis"')::text AS analysis,
           to_regclass('"AgentAuditEvent"')::text AS audit
  `;
  const relation = relations[0];
  assert(
    relation && Object.values(relation).every(Boolean),
    "One or more production agent tables are missing",
  );

  const indexes = await db.$queryRaw`
    SELECT indexname
    FROM pg_indexes
    WHERE schemaname = current_schema()
      AND indexname IN (
        'AgentWorkflow_status_availableAt_createdAt_idx',
        'AgentWorkflow_userId_idempotencyKey_key',
        'AgentAuditEvent_workflowId_createdAt_id_idx'
      )
  `;
  assert(indexes.length === 3, "One or more workflow queue/idempotency/audit indexes are missing");

  const triggers = await db.$queryRaw`
    SELECT tgname
    FROM pg_trigger
    WHERE tgrelid = '"AgentAuditEvent"'::regclass
      AND NOT tgisinternal
      AND tgenabled <> 'D'
      AND tgname IN (
        'AgentAuditEvent_append_only_update',
        'AgentAuditEvent_append_only_delete'
      )
  `;
  assert(triggers.length === 2, "Append-only audit triggers are missing or disabled");

  console.log("Production database schema verification passed.");
} finally {
  await db.$disconnect();
}

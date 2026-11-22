-- Nullable: do not infer publication dates from ingestion/application timestamps.
ALTER TABLE "Job" ADD COLUMN "publishedAt" TIMESTAMP(3),
                  ADD COLUMN "publicationPrecision" TEXT,
                  ADD COLUMN "publicationKind" TEXT;
CREATE INDEX "Job_userId_publishedAt_id_idx" ON "Job"("userId", "publishedAt" DESC, "id");

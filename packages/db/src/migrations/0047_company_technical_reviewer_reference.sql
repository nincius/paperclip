ALTER TABLE "companies" ADD COLUMN "technical_reviewer_reference" text;
--> statement-breakpoint
COMMENT ON COLUMN "companies"."technical_reviewer_reference" IS 'Reference to the technical reviewer assigned to this company';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_companies_technical_reviewer_reference" ON "companies" ("technical_reviewer_reference");

-- Manual rollback (not applied by the migrator):
-- DROP INDEX IF EXISTS "idx_companies_technical_reviewer_reference";
-- ALTER TABLE "companies" DROP COLUMN "technical_reviewer_reference";

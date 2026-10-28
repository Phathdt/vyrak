-- Rollback migration: Revert S3 storage (Floci) to PostgreSQL TEXT storage
-- WARNING: Only use if S3 migration needs to be reverted
-- This will PERMANENTLY DELETE S3 metadata from existing records

BEGIN;

-- Add content column back
ALTER TABLE "artifacts" ADD COLUMN "content" TEXT;

-- Remove S3 columns
ALTER TABLE "artifacts" DROP COLUMN "s3_bucket";
ALTER TABLE "artifacts" DROP COLUMN "s3_key";
ALTER TABLE "artifacts" DROP COLUMN "content_size";
ALTER TABLE "artifacts" DROP COLUMN "content_type";

COMMIT;

-- To apply this rollback:
-- psql $DATABASE_URL < scripts/rollback-s3-migration.sql
--
-- After applying, you must also:
-- 1. Revert prisma/schema.prisma to use content TEXT field
-- 2. Run: yarn db:generate
-- 3. Revert libs/agent-runtime/src/domain/interfaces/artifact-repository.interface.ts
-- 4. Run: yarn ctix
-- 5. Run: yarn typecheck

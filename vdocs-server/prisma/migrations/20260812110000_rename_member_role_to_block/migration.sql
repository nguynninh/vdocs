-- AlterEnum: MEMBER meant "no explicit role assigned" and was never used by
-- any invite flow; rename it to BLOCK, an explicit deny that can be used to
-- override an otherwise-inherited permission.
ALTER TABLE "WorkspaceMember" ALTER COLUMN "role" DROP DEFAULT;
ALTER TYPE "WorkspaceMemberRole" RENAME VALUE 'MEMBER' TO 'BLOCK';
ALTER TABLE "WorkspaceMember" ALTER COLUMN "role" SET DEFAULT 'BLOCK';

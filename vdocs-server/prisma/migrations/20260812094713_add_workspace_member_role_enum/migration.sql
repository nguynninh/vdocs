-- CreateEnum
CREATE TYPE "WorkspaceMemberRole" AS ENUM ('OWNER', 'FULL_ACCESS', 'EDITOR', 'COMMENTER', 'VIEWER', 'MEMBER');

-- AlterTable
ALTER TABLE "WorkspaceMember"
  ALTER COLUMN "role" DROP DEFAULT,
  ALTER COLUMN "role" TYPE "WorkspaceMemberRole" USING ("role"::"WorkspaceMemberRole"),
  ALTER COLUMN "role" SET DEFAULT 'MEMBER';

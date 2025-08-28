-- Add officeId column to User (nullable initially)
-- Office.id is a Prisma String -> TEXT in Postgres, so use TEXT here (not UUID)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "officeId" TEXT;

-- Add foreign key constraint referencing Office
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'User_officeId_fkey'
    ) THEN
        ALTER TABLE "User"
            ADD CONSTRAINT "User_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- AlterEnum (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum e
                   JOIN pg_type t ON e.enumtypid = t.oid
                   WHERE t.typname = 'BayType' AND e.enumlabel = 'SORTING') THEN
        ALTER TYPE "BayType" ADD VALUE 'SORTING';
    END IF;
END $$;

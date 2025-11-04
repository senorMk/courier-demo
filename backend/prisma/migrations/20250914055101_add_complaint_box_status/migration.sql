-- AlterEnum (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum e
                   JOIN pg_type t ON e.enumtypid = t.oid
                   WHERE t.typname = 'ParcelStatus' AND e.enumlabel = 'COMPLAINT_BOX') THEN
        ALTER TYPE "ParcelStatus" ADD VALUE 'COMPLAINT_BOX';
    END IF;
END $$;

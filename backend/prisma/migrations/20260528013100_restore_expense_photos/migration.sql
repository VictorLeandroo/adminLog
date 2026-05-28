CREATE TABLE IF NOT EXISTS "ExpensePhoto" (
    "id" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpensePhoto_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'ExpensePhoto_expenseId_fkey'
    ) THEN
        ALTER TABLE "ExpensePhoto"
        ADD CONSTRAINT "ExpensePhoto_expenseId_fkey"
        FOREIGN KEY ("expenseId") REFERENCES "Expense"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

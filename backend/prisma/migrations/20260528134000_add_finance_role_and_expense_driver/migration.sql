ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'FINANCE';

ALTER TABLE "Expense" ADD COLUMN "driverId" TEXT;

ALTER TABLE "Expense"
ADD CONSTRAINT "Expense_driverId_fkey"
FOREIGN KEY ("driverId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Expense_driverId_idx" ON "Expense"("driverId");

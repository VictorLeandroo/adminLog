-- CreateTable
CREATE TABLE "FreightSetting" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "baseAmount" DECIMAL(12,2) NOT NULL DEFAULT 400,
    "includedKm" INTEGER NOT NULL DEFAULT 120,
    "excessKmAmount" DECIMAL(12,2) NOT NULL DEFAULT 1.5,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FreightSetting_pkey" PRIMARY KEY ("id")
);

INSERT INTO "FreightSetting" ("id", "baseAmount", "includedKm", "excessKmAmount", "updatedAt")
VALUES ('default', 400, 120, 1.5, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

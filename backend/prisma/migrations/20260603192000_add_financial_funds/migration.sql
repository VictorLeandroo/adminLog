CREATE TYPE "FundMovementType" AS ENUM ('IN', 'OUT');

CREATE TABLE "FinancialFund" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "target" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialFund_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinancialFundMovement" (
    "id" TEXT NOT NULL,
    "fundId" TEXT NOT NULL,
    "type" "FundMovementType" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialFundMovement_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "FinancialFundMovement"
ADD CONSTRAINT "FinancialFundMovement_fundId_fkey"
FOREIGN KEY ("fundId") REFERENCES "FinancialFund"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "FinancialFund" ("id", "name", "description", "target", "active", "updatedAt") VALUES
('reserve', 'Reserva de emergencia', 'Protecao do caixa operacional', 0, true, CURRENT_TIMESTAMP),
('maintenance', 'Fundo de manutencao', 'Reserva para revisoes e reparos', 0, true, CURRENT_TIMESTAMP),
('expansion', 'Expansao / frota', 'Renovacao ou crescimento da frota', 0, true, CURRENT_TIMESTAMP),
('office', 'Reforma escritorio', 'Melhorias administrativas', 0, true, CURRENT_TIMESTAMP),
('partners', 'Distribuicao socios', 'Valor destinado aos socios', 0, true, CURRENT_TIMESTAMP);

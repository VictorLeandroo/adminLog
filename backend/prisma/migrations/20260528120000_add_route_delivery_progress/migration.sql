ALTER TABLE "Route" ADD COLUMN "plannedDeliveries" INTEGER;

ALTER TABLE "RoutePhoto" ADD COLUMN "deliveryIndex" INTEGER;
ALTER TABLE "RoutePhoto" ADD COLUMN "deliveryNote" TEXT;
ALTER TABLE "RoutePhoto" ADD COLUMN "deliveredAt" TIMESTAMP(3);

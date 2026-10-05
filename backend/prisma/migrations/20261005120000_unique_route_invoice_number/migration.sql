-- Se houver duplicatas antigas, a migração falha sem excluir nenhuma nota.
-- Corrija os números duplicados antes de reaplicar a migração.
CREATE UNIQUE INDEX "RouteInvoice_number_key" ON "RouteInvoice"("number");

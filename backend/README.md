# Fiorino Tracker API

Backend Node/Express com Prisma e PostgreSQL.

## Setup

```bash
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate
npm run seed
npm run dev
```

Servidor padrao: `http://localhost:4000/api`.

## Consulta periódica ao banco

O mecanismo principal é o job `fiorino_keep_alive` no próprio Supabase, definido
em `prisma/keepalive.sql`. Ele chama a API no Render a cada 5 minutos, 24 horas
por dia, para verificar servidor e banco mesmo sem usuários conectados.
Consulte `KEEPALIVE.md` na raiz para instalação, verificação e limites.

Ao iniciar a API, o backend executa `SELECT 1` e repete a consulta a cada
29 minutos, sem depender de uma aba aberta. Falhas são registradas no log e
não interrompem a API. Para desativar, use `DATABASE_KEEP_ALIVE_ENABLED=false`.

O processo do backend precisa permanecer ativo. Se a hospedagem também suspende
o servidor por inatividade, este timer não roda durante a suspensão; nesse caso,
é necessário um agendador externo. A consulta não reativa um projeto já pausado
nem garante a ausência de outras causas de lentidão.

O monitor externo existente em `.github/workflows/keepalive.yml` complementa esse
timer: consulta `/health/database` a cada 10 minutos, na janela configurada nas
variáveis do GitHub. Consulte `KEEPALIVE.md` na raiz para os detalhes. No Render,
`/health` também informa `revision` para conferir o commit publicado.

## Números de notas fiscais únicos

A criação, finalização e revisão de rotas rejeitam números repetidos na lista
ou já cadastrados em outra rota, com resposta HTTP 409 e mensagem na tela.
Os espaços no início e no fim são removidos, preservando o restante do número
(inclusive zeros à esquerda). Uma rota pode manter seus próprios números ao editar.

Na publicação, aplique a migração para proteger também cadastros simultâneos:

```bash
npm run prisma:deploy
npm run prisma:generate
```

Se já existirem duplicatas, a migração falhará sem excluir dados. Para identificá-las:

```sql
SELECT "number", count(*) AS quantidade, array_agg("routeId") AS rotas
FROM "RouteInvoice"
GROUP BY "number"
HAVING count(*) > 1;
```

Corrija as notas nas rotas indicadas antes de reaplicar a migração. Se o Prisma
registrar a tentativa como falha, após corrigir os dados execute
`npx prisma migrate resolve --rolled-back 20261005120000_unique_route_invoice_number`
e repita `npm run prisma:deploy`.

## Primeiro login seeded

Admin:

```text
admin@fiorino.local
123456
```

Motorista:

```text
motorista@fiorino.local
123456
```

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

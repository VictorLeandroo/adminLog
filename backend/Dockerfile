FROM node:20-bookworm-slim

ENV NODE_ENV=production
ENV LIBREOFFICE_PATH=/usr/bin/soffice

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    fontconfig \
    fonts-dejavu \
    fonts-liberation \
    libreoffice-calc \
    libreoffice-writer \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --include=dev

COPY prisma ./prisma
RUN npx prisma generate

COPY src ./src

RUN npm prune --omit=dev

EXPOSE 4000

CMD ["npm", "start"]

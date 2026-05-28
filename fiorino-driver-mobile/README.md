# Fiorino Driver Mobile (Expo)

Port da área do **motorista** do `fiorino-tracker` para React Native com Expo:
- login do motorista
- rota atual
- iniciar rota
- registrar entrega com fotos
- finalizar rota (com pedágio opcional)
- detalhes da rota (cidades, notas e fotos)
- relatar erro

## Rodar

```bash
cd fiorino-driver-mobile
npm install
npm start
```

## API

Arquivo: `src/services/api.js`

Por padrão está:
- `https://adminlog-1.onrender.com/api`

Se quiser ambiente local, altere o `baseURL`.

## Observações

- O app restringe login para `role === DRIVER`.
- Upload de fotos usa endpoint `/uploads`, igual ao front web.

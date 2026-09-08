# Monitoramento de adminLog e wehome

O workflow .github/workflows/keepalive.yml executa no repositório público adminLog e verifica ambos os backends. Não há processo rodando dentro de um servidor que pode estar suspenso.

## Ativação

Em adminLog > Settings > Secrets and variables > Actions:
- Secrets ADMINLOG_URL e WEHOME_URL: URLs base HTTPS dos backends Render, sem barra final.
- Variable KEEPALIVE_ENABLED=true: ativa as execuções. Sem ela, nenhum ping é feito.
- Variables opcionais KEEPALIVE_START_HOUR e KEEPALIVE_END_HOUR: horas em America/Sao_Paulo. Padrão: 8 até 19, todos os dias. Fim exclusivo.
- Para 24h, configure início 0 e fim 24 apenas depois de conferir a franquia do Render.

Publique os backends antes de ativar: ambos precisam responder em GET /health/database.
Use Actions > Monitorar APIs e bancos > Run workflow para uma verificação imediata; execuções manuais ignoram o horário, mas exigem KEEPALIVE_ENABLED=true.

O bot verifica servidor e banco a cada 10 minutos durante o período selecionado.
Não retorna dados pessoais. A consulta ao banco tem cache de 5 minutos e chamadas simultâneas compartilham a mesma consulta. Falhas retornam 503.
O monitor espera até 90 segundos pela partida inicial e tenta novamente uma vez. Os projetos são verificados em paralelo.

## Limites

- Render Free: 750 horas por workspace/mês compartilhadas pelos serviços. Dois serviços 24h excedem essa cota.
- A janela padrão de 11h/dia reduz o consumo, mas acessos fora dela e outros serviços também contam. Não há garantia de permanecer dentro da franquia.
- O GitHub pode atrasar/descartar execuções agendadas; após 60 dias sem atividade em repositório público pode desativar o agendamento. Não fazemos commits artificiais.
- Uma janela de 24h e pings não garantem disponibilidade.
- Os runners padrão no repositório público evitam consumir minutos do repositório privado wehome.
- Supabase pausado precisa ser restaurado no painel; pings não restauram projetos.
- Monitoramento não resolve consultas lentas, pouca CPU, rede ou saturação de banco.

Referências:
https://render.com/docs/free
https://supabase.com/docs/guides/platform/free-project-pausing
https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule
https://docs.github.com/en/billing/concepts/product-billing/github-actions

WEHOME_URL é opcional enquanto o backend do wehome não estiver disponível. Nesse caso, o monitor verifica apenas adminLog e registra a pendência no log.

-- Configuração operacional do Supabase de produção do Fiorino.
-- Não aplicar no PostgreSQL local: depende de pg_cron e pg_net.
-- Reexecutar atualiza o mesmo job, sem criar agendamentos duplicados.
DO $setup$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
  CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

  PERFORM cron.schedule(
    'fiorino_keep_alive',
    '*/5 * * * *',
    $job$
      SELECT net.http_get(
        url := 'https://adminlog-1.onrender.com/health/database',
        headers := '{"User-Agent":"FiorinoSupabaseKeepAlive/1.0","Cache-Control":"no-cache"}'::jsonb,
        timeout_milliseconds := 90000
      );
    $job$
  );
END
$setup$;

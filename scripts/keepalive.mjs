import { pathToFileURL } from 'node:url';

export function targetsFrom(env) {
  return ['ADMINLOG', 'WEHOME'].filter(name => name === 'ADMINLOG' || env[name + '_URL']?.trim()).map(name => {
    const raw = env[name + '_URL']?.trim();
    let url;
    try { url = new URL(raw); } catch { throw new Error(name + '_URL deve ser uma URL HTTPS.'); }
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
      throw new Error(name + '_URL deve ser a URL base HTTPS, sem credenciais, caminho ou parâmetros.');
    }
    return { name, url: new URL('/health/database', url).href };
  });
}
export function inWindow(env, date = new Date()) {
  const start = Number(env.START_HOUR || 8);
  const end = Number(env.END_HOUR || 19);
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || start >= end || end > 24) throw new Error('Janela inválida: use 0 <= início < fim <= 24.');
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Sao_Paulo', hour: 'numeric', hourCycle: 'h23' }).format(date));
  return hour >= start && hour < end;
}
export async function checkTarget(target, request = fetch, pause = ms => new Promise(resolve => setTimeout(resolve, ms))) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    const started = Date.now();
    try {
      const response = await request(target.url, { signal: AbortSignal.timeout(90000), redirect: 'error', headers: { 'User-Agent': 'ProjectHealthMonitor/1.0', 'Cache-Control': 'no-cache' } });
      const body = await response.json();
      if (!response.ok || body.ok !== true || body.database !== 'available') throw new Error('Unhealthy');
      console.log(target.name + ': API e banco OK (' + ((Date.now() - started) / 1000).toFixed(1) + 's)');
      return true;
    } catch {
      console.error(target.name + ': verificação falhou, tentativa ' + attempt + '/2.');
      if (attempt === 1) await pause(5000);
    }
  }
  return false;
}
export async function main(env = process.env) {
  const active = inWindow(env);
  if (env.EVENT_NAME === 'schedule' && !active) {
    console.log('Fora do horário configurado.');
    return 0;
  }
  if (!env.WEHOME_URL?.trim()) console.log('WEHOME: backend not configured; checking adminLog only.'); const results = await Promise.all(targetsFrom(env).map(target => checkTarget(target)));
  return results.every(Boolean) ? 0 : 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().then(code => { process.exitCode = code; }).catch(error => { console.error(error.message); process.exitCode = 1; });
}

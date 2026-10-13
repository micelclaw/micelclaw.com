// One-off, explicitly approved publication. Invoked by a dated systemd user timer.
import { readFileSync, mkdirSync, openSync, closeSync, writeFileSync, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { sendText } from './lib/telegram.mjs';
import { env } from './lib/env.mjs';
const repo = '/home/victor/Projects/web/micelclaw.com';
const codex = '/home/victor/.vscode-server/extensions/openai.chatgpt-26.5917.62051-linux-x64/bin/linux-x86_64/codex';
const prompt = `${repo}/content-ops/specs/ep5-mail-scheduled-publication-2026-09-28.md`;
const stateDir = '/home/victor/Projects/_artifacts/scratch/ep5-mail-scheduled-2026-09-28';
const start = Date.parse('2026-09-28T20:00:00+02:00');
const end = Date.parse('2026-09-28T22:00:00+02:00');
const dry = process.argv.includes('--dry-run');
if (!existsSync(codex) || !existsSync(prompt)) throw new Error('Executor/prompt missing');
if (dry) {
  console.log(JSON.stringify({dryRun:true,startsAt:'2026-09-28 20:00 Europe/Madrid',expiresAt:'2026-09-28 22:00 Europe/Madrid',executor:codex,prompt,alreadyAttempted:existsSync(`${stateDir}/started.json`)}));
  process.exit(0);
}
if (Date.now() < start || Date.now() > end) {
  console.log('Outside approved launch window; nothing executed.');
  process.exit(1);
}
mkdirSync(stateDir,{recursive:true,mode:0o700});
try {
  const fd=openSync(`${stateDir}/started.json`,'wx',0o600);
  writeFileSync(fd,JSON.stringify({startedAt:new Date().toISOString(),task:'ep5-mail'}));closeSync(fd);
} catch {
  console.log('An attempt already exists; no automatic retry or duplicate publication.');
  process.exit(1);
}
const output = `${stateDir}/report.md`;
const log = openSync(`${stateDir}/executor.log`,'wx',0o600);
const args=['--ask-for-approval','never','exec','--ephemeral','--sandbox','danger-full-access','--color','never','-C',repo,'--output-last-message',output,'-'];
const child=spawn(codex,args,{cwd:repo,stdio:['pipe',log,log],env:{...process.env,PATH:'/usr/local/bin:/usr/bin:/bin'}});
child.stdin.end(readFileSync(prompt,'utf8'));
let launchError=false;
child.on('error',()=>{launchError=true;});
const code=await new Promise(resolve=>child.on('close',resolve));
closeSync(log);
writeFileSync(`${stateDir}/finished.json`,JSON.stringify({finishedAt:new Date().toISOString(),exitCode:code,launchError}),{mode:0o600});
const report=existsSync(output)?readFileSync(output,'utf8').trim():'';
const message=report || 'No se obtuvo reporte de la publicación de Mail. Revisar el ejecutor y los recibos antes de reintentar; no se ha supuesto éxito.';
// Never send an operational report to the public content channel.
for(let i=0;i<message.length;i+=3500){
  const notice=await sendText(env('NOTIFY_TELEGRAM_CHAT_ID'),`Mail — tarea de las 20:00\n${message.slice(i,i+3500)}`);
  if(!notice.sent)console.warn('Private operator notification not delivered; see report on disk.');
}
console.log(`Publication executor finished: ${code}. Report: ${output}`);
process.exit(code===0&&!launchError?0:1);

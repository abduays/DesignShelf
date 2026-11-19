import { createRequire } from 'node:module';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const require=createRequire(import.meta.url);
const {collectTokenCounts,buildDtcgTokens}=require('../token-export.js');
const groups=collectTokenCounts([{tokens:{colors:['rgb(255, 0, 0)','rgba(0, 0, 0, 0.5)','#abcdef'],fontFamily:'Arial, sans-serif',fontSize:'16px',fontWeight:'700',lineHeight:'24px',letterSpacing:'0px',borderRadius:'8px'}}]);
const tokens=buildDtcgTokens(groups);
const directory=mkdtempSync(join(tmpdir(),'designshelf-dtcg-'));
const file=join(directory,'observed.tokens.json');
writeFileSync(file,JSON.stringify(tokens,null,2));
try {
  const result=spawnSync('npx',['--yes','open-design-tokens@0.7.0',file,'--format','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
  if(result.error) throw result.error;
  if(result.status!==0) {
    process.stderr.write(result.stdout||'');
    process.stderr.write(result.stderr||'');
    throw new Error('Independent DTCG validator failed with exit code '+result.status);
  }
  process.stdout.write('Independent DTCG 2025.10 validation passed using open-design-tokens@0.7.0.\n');
  if(result.stdout) process.stdout.write(result.stdout);
} finally { rmSync(directory,{recursive:true,force:true}); }

Play with your Claude Pet!

Appends a play event to the pet's event file so your desktop pet reacts with an excited playing animation. Shows current pet status after playing.

```bash
mkdir -p ~/.claude-pet && echo '{"type":"play","timestamp":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}' >> ~/.claude-pet/events.jsonl

node -e "
const fs=require('fs'),os=require('os'),p=require('path'),h=os.homedir();
const pl=os.platform();
const d=pl==='win32'?p.join(process.env.APPDATA||'','claude-pet'):pl==='darwin'?p.join(h,'Library/Application Support/claude-pet'):p.join(h,'.config/claude-pet');
try{
  const c=JSON.parse(fs.readFileSync(p.join(d,'config.json'),'utf-8'));
  const s=c.petState||{};
  let n='';try{n=fs.readFileSync(p.join(h,'.claude-pet/name.txt'),'utf-8').trim()}catch{}
  const name=n||'Your pet';
  const hunger=s.hunger||50;
  const oldHappy=s.happiness||50;const newHappy=Math.min(100,oldHappy+25);
  const energy=s.energy||50;
  const exp=(s.exp||0)+5;
  const stage=exp>=500?'Adult':exp>=100?'Teen':'Baby';
  const lv=exp>=500?3:exp>=100?2:1;
  console.log();
  console.log('🎮 '+name+' bounces around excitedly!');
  console.log('📊 Lv.'+lv+' '+stage+' | 🍗 Hunger: '+hunger+'% | 😊 Happy: '+oldHappy+'→'+newHappy+'% | ⚡ Energy: '+energy+'% | ⭐ EXP: '+exp);
  console.log();
}catch{console.log('\n🎮 You played with your pet! It\\'s so excited~\n')}
" 2>/dev/null || echo "🎮 You played with your pet! It's so excited~"
```

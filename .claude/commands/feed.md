Feed your Claude Pet!

Appends a feed event to the pet's event file so your desktop pet reacts with a happy eating animation. Shows current pet status after feeding.

```bash
mkdir -p ~/.claude-pet && echo '{"type":"feed","timestamp":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}' >> ~/.claude-pet/events.jsonl

node -e "
const fs=require('fs'),os=require('os'),p=require('path'),h=os.homedir();
const pl=os.platform();
const d=pl==='win32'?p.join(process.env.APPDATA||'','claude-pet'):pl==='darwin'?p.join(h,'Library/Application Support/claude-pet'):p.join(h,'.config/claude-pet');
try{
  const c=JSON.parse(fs.readFileSync(p.join(d,'config.json'),'utf-8'));
  const s=c.petState||{};
  let n='';try{n=fs.readFileSync(p.join(h,'.claude-pet/name.txt'),'utf-8').trim()}catch{}
  const name=n||'Your pet';
  const oldH=s.hunger||50;const newH=Math.max(0,oldH-30);
  const happy=s.happiness||50;const energy=s.energy||50;
  const exp=(s.exp||0)+5;
  const stage=exp>=500?'Adult':exp>=100?'Teen':'Baby';
  const lv=exp>=500?3:exp>=100?2:1;
  console.log();
  console.log('🍖 *nom nom* '+name+' happily eats the food!');
  console.log('📊 Lv.'+lv+' '+stage+' | 🍗 Hunger: '+oldH+'→'+newH+'% | 😊 Happy: '+happy+'% | ⚡ Energy: '+energy+'% | ⭐ EXP: '+exp);
  console.log();
}catch{console.log('\n🍖 Your pet has been fed! It looks happy~\n')}
" 2>/dev/null || echo "🍖 Your pet has been fed! It looks happy~"
```

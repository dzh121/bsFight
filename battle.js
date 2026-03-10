const $=id=>document.getElementById(id);
const foodInput=$('foodInput'),startBtn=$('startBtn'),sampleBtn=$('sampleBtn'),clearBtn=$('clearBtn'),restartBtn=$('restartBtn');
const fightBtn=$('fightBtn'),skipBtn=$('skipBtn'),autoAllBtn=$('autoAllBtn');
const battleArea=$('battleArea'),progressText=$('progressText'),bracketBar=$('bracketBar');
const arenaWrapper=$('arenaWrapper'),countdownOverlay=$('countdownOverlay'),countdownNumber=$('countdownNumber'),countdownSub=$('countdownSub');
const fighterAEl=$('fighterA'),fighterBEl=$('fighterB');
const foodAEl=$('foodA'),foodBEl=$('foodB'),emojiAEl=$('emojiA'),emojiBEl=$('emojiB');
const scoreAEl=$('scoreA'),scoreBEl=$('scoreB');
const hpBarA=$('hpBarA'),hpBarB=$('hpBarB'),hpTextA=$('hpTextA'),hpTextB=$('hpTextB');
const nrgBarA=$('nrgBarA'),nrgBarB=$('nrgBarB'),nrgTextA=$('nrgTextA'),nrgTextB=$('nrgTextB');
const statsAEl=$('statsA'),statsBEl=$('statsB'),vsText=$('vsText');
const battleLogContainer=$('battleLogContainer'),battleLogBody=$('battleLogBody'),turnCounter=$('turnCounter');
const winnerBox=$('winnerBox'),winnerNameEl=$('winnerName'),winnerTextEl=$('winnerText'),rankingEl=$('ranking');
const particleContainer=$('particleContainer'),mainContainer=$('mainContainer');

const emojiMap={'פיצה':'🍕','סושי':'🍣','שווארמה':'🥙','המבורגר':'🍔','סביח':'🥪','פלאפל':'🧆','חומוס':'🫓','פסטה':'🍝','בורגר':'🍔','טאקו':'🌮','בוריטו':'🌯','ראמן':'🍜','נודלס':'🍜','סלט':'🥗','שקשוקה':'🍳','סטייק':'🥩','טוסט':'🥪','קארי':'🍛','מוקפץ':'🥡','סנדוויץ':'🥪','כריך':'🥪','טוסטוס':'🥪','פנקייק':'🥞','כנפיים':'🍗','עוף':'🍗','נקניקיות':'🌭','גלידה':'🍦','דונאט':'🍩','צ׳יפס':'🍟','שניצל':'🍗','קבב':'🥙','דג':'🐟','לזניה':'🍝','רביולי':'🥟','טמפורה':'🍤','ביצה':'🥚','בייגל':'🥯','קרואסון':'🥐','וופל':'🧇'};

const atkNames=['מכת טעם','חטיפה מהירה','סיבוב רוטב','השלכת תיבול','מכת שף','נחיתה חמה','מעוף פיתה','סיבוב גריל','חיתוך סכין','מכת כף','זריקת סלט','מטר רטבים','מהלך סודי','אגרוף טחינה','בעיטת חומוס','סופת גבינה','התקפת עגבניה','מכת בצל','ניצוצות פלפל','גל חריף','מכת שום','סופר סלייס','טורנדו טעמים','פרץ תבלינים','שיגור רוטב','גל חום','סמאש קרמל','מערבולת קטשופ','מכת מיונז','פיצוץ קארי'];
const specialNames=['⭐ סופר מכה מיוחדת','⭐ מהלך גמר','⭐ אולטימייט אטאק','⭐ מכת הטעם האולטימטיבית','⭐ התקפה קוסמית','⭐ מכת גורל'];
const critLines=['מכה קריטית!!!','CRITICAL HIT!','נזק כפול!','מכה מוחצת!','סופר אפקטיבי!','BOOM!'];
const dodgeLines=['התחמק ברגע האחרון!','מוס! החטיא!','תנועה מהירה - נמנע!','דודג׳!','חמק בסטייל!','נע הצידה!'];
const crowdLines=['🔥 הקהל משתגע!','👀 כולם על קצה הכיסא!','📢 צעקות מהקהל!','🍿 מתח בלתי נסבל!','😱 לא מאמינים!','💥 איזה סיבוב!','🎺 הקהל קורא את השם!','🤯 מטורף!','📣 כולם על הרגליים!','🥁 תופים ברקע!','😤 המתח בשיא!','🎆 איזה מופע!'];
const healLines=['ריפוי מהיר!','חידוש כוחות!','התאוששות!','ספג אנרגיה!'];
const poisonLines=['רעל ברוטב!','תיבול רעיל!','מנה מורעלת!'];
const counterLines=['קאונטר אטאק!','תפס והחזיר!','בומרנג!'];
const buffLines=['באסט כוח!','מצב על!','העצמה!','כוח פנימי!'];

let allFoods=[],eliminatedFoods=new Set(),currentRound=[],nextRound=[];
let currentMatch=0,roundNumber=1,totalMatchesPlayed=0,currentPair=null,isBusy=false,autoRunId=null;
const MAX_HP=100,MAX_NRG=100,TURN_DELAY=550;

function rand(a,b){return Math.floor(Math.random()*(b-a+1))+a}
function pick(arr){return arr[rand(0,arr.length-1)]}
function normalizeFoods(t){return[...new Set(t.split('\n').map(s=>s.trim()).filter(Boolean))]}
function shuffle(a){const c=[...a];for(let i=c.length-1;i>0;i--){const j=rand(0,i);[c[i],c[j]]=[c[j],c[i]]}return c}

function generateBalancedStats(){
  // Total budget between 310-380, each stat 25-95, ensures balance
  const budget=rand(310,380);
  let vals=[];let remaining=budget;
  for(let i=0;i<5;i++){
    const maxV=Math.min(95,remaining-(5-i)*25);
    const v=rand(25,Math.max(25,maxV));
    vals.push(v);remaining-=v;
  }
  vals.push(Math.max(25,Math.min(95,remaining)));
  vals=shuffle(vals);
  return{power:vals[0],speed:vals[1],hype:vals[2],chaos:vals[3],luck:vals[4],defense:vals[5]};
}

function buildFoodObjects(names){
  return shuffle(names).map(name=>({name,wins:0,stats:generateBalancedStats()}));
}

function getEmoji(n){if(emojiMap[n])return emojiMap[n];const f=Object.entries(emojiMap).find(([k])=>n.includes(k)||k.includes(n));return f?f[1]:'🍽️'}

function renderStatBars(el,stats){
  const items=[
    {k:'power',label:'כוח',v:stats.power},{k:'speed',label:'מהירות',v:stats.speed},
    {k:'hype',label:'הייפ',v:stats.hype},{k:'chaos',label:'כאוס',v:stats.chaos},
    {k:'luck',label:'מזל',v:stats.luck},{k:'defense',label:'הגנה',v:stats.defense}
  ];
  el.innerHTML=items.map(i=>`<div class="stat-row"><span class="stat-name">${i.label}</span><div class="stat-bar-outer"><div class="stat-bar-fill ${i.k}" style="width:0%"></div></div><span class="stat-val">${i.v}</span></div>`).join('');
  requestAnimationFrame(()=>requestAnimationFrame(()=>{el.querySelectorAll('.stat-bar-fill').forEach((b,idx)=>b.style.width=items[idx].v+'%')}));
}

function updateHpBar(bar,txt,hp,mx){
  const p=Math.max(0,Math.round(hp/mx*100));bar.style.width=p+'%';
  bar.classList.remove('medium','low');
  if(p<=25)bar.classList.add('low');else if(p<=55)bar.classList.add('medium');
  txt.textContent=`${Math.max(0,Math.round(hp))}/${mx}`;
}
function updateNrgBar(bar,txt,nrg){
  const p=Math.max(0,Math.min(100,Math.round(nrg)));bar.style.width=p+'%';txt.textContent=`${p}/${MAX_NRG}`;
}

function spawnParticles(x,y,color,count=8){
  for(let i=0;i<count;i++){
    const p=document.createElement('div');p.className='particle';const sz=rand(4,12);
    p.style.cssText=`width:${sz}px;height:${sz}px;background:${color};left:${x}px;top:${y}px;--px:${rand(-80,80)}px;--py:${rand(-80,80)}px;`;
    particleContainer.appendChild(p);setTimeout(()=>p.remove(),800);
  }
}
function spawnTextParticle(x,y,text,color='#facc15'){
  const p=document.createElement('div');p.className='text-particle';p.textContent=text;
  p.style.cssText=`left:${x}px;top:${y}px;color:${color};`;
  particleContainer.appendChild(p);setTimeout(()=>p.remove(),1200);
}
function showPopup(el,text,cls=''){
  const d=document.createElement('div');d.className='dmg-popup '+cls;d.textContent=text;
  d.style.left=rand(15,65)+'%';d.style.top=rand(5,25)+'%';
  el.appendChild(d);setTimeout(()=>d.remove(),800);
}
function setStatus(el,icon){
  el.querySelectorAll('.status-icon').forEach(s=>s.remove());
  if(!icon)return;const s=document.createElement('div');s.className='status-icon';s.textContent=icon;el.appendChild(s);
}
function addLog(icon,text,cls=''){
  const e=document.createElement('div');e.className='log-entry '+(cls||'');
  e.innerHTML=`<span class="log-icon">${icon}</span><span class="log-text">${text}</span>`;
  battleLogBody.appendChild(e);battleLogBody.scrollTop=battleLogBody.scrollHeight;
}
function screenShake(big=false){
  mainContainer.classList.remove('screen-shake','screen-big-shake');void mainContainer.offsetWidth;
  mainContainer.classList.add(big?'screen-big-shake':'screen-shake');
  setTimeout(()=>mainContainer.classList.remove('screen-shake','screen-big-shake'),500);
}
function applyAnim(el,cls,dur=400){el.classList.remove(cls);void el.offsetWidth;el.classList.add(cls);setTimeout(()=>el.classList.remove(cls),dur)}
function getElCenter(el){const r=el.getBoundingClientRect(),w=arenaWrapper.getBoundingClientRect();return{x:r.left-w.left+r.width/2,y:r.top-w.top+r.height/3}}

function updateBracket(){
  bracketBar.innerHTML=allFoods.map(f=>{
    let c='alive';if(eliminatedFoods.has(f.name))c='eliminated';
    else if(currentPair&&(currentPair[0].name===f.name||currentPair[1].name===f.name))c='fighting';
    return`<span class="bracket-item ${c}">${getEmoji(f.name)} ${f.name}</span>`;
  }).join('');
}
function updateBtns(){
  const fin=winnerBox.classList.contains('active');
  fightBtn.disabled=!currentPair||isBusy||fin;skipBtn.disabled=!currentPair||isBusy||fin;autoAllBtn.disabled=!currentPair||fin;
}
function stopAutoRun(){if(autoRunId!==null){clearTimeout(autoRunId);autoRunId=null}}
function spawnConfetti(n=120){
  const c=document.createElement('div');c.className='confetti-container';document.body.appendChild(c);
  const cols=['#ef4444','#f59e0b','#22c55e','#3b82f6','#a855f7','#ec4899','#facc15','#06b6d4'];
  for(let i=0;i<n;i++){const p=document.createElement('div');p.className='confetti-piece';
    p.style.cssText=`left:${rand(0,100)}%;width:${rand(6,14)}px;height:${rand(6,14)}px;background:${pick(cols)};border-radius:${rand(0,1)?'50%':'2px'};animation-duration:${rand(20,45)/10}s;animation-delay:${rand(0,25)/10}s;`;
    c.appendChild(p);}setTimeout(()=>c.remove(),6000);
}

async function runCountdown(n1,n2){
  countdownOverlay.classList.add('active');countdownSub.textContent=`${n1} vs ${n2}`;
  for(const n of['3','2','1','!FIGHT']){
    countdownNumber.textContent=n;countdownNumber.style.animation='none';void countdownNumber.offsetWidth;
    countdownNumber.style.animation='cpop 0.6s ease';
    countdownNumber.style.color=n==='!FIGHT'?'#ef4444':'var(--gold)';
    countdownNumber.style.textShadow=n==='!FIGHT'?'0 0 80px rgba(239,68,68,.6)':'0 0 60px rgba(250,204,21,.5)';
    await new Promise(r=>setTimeout(r,620));
  }
  await new Promise(r=>setTimeout(r,220));countdownOverlay.classList.remove('active');
}

// ─── MAIN FIGHT ENGINE ───
async function animatedFight(f1,f2){
  // Clone stats so buffs don't persist across matches
  const s1={...f1.stats},s2={...f2.stats};
  let hp1=MAX_HP,hp2=MAX_HP,nrg1=0,nrg2=0;
  let poison1=0,poison2=0,combo1=0,combo2=0;
  const maxTurns=rand(8,15);let turn=0;

  battleLogContainer.style.display='block';battleLogBody.innerHTML='';
  addLog('🔔',`<b>${f1.name}</b> ${getEmoji(f1.name)} נגד <b>${f2.name}</b> ${getEmoji(f2.name)}`,'crowd');
  addLog('📊',`${f1.name} [💪${s1.power} ⚡${s1.speed} 🛡${s1.defense} 🎲${s1.luck}] | ${f2.name} [💪${s2.power} ⚡${s2.speed} 🛡${s2.defense} 🎲${s2.luck}]`,'crowd');
  turnCounter.textContent='תור 0';
  setStatus(fighterAEl,null);setStatus(fighterBEl,null);
  arenaWrapper.classList.remove('intense');

  await runCountdown(f1.name,f2.name);
  vsText.classList.add('fire');

  while(hp1>0&&hp2>0&&turn<maxTurns*2){
    turn++;const turnNum=Math.ceil(turn/2);
    turnCounter.textContent=`תור ${turnNum}`;
    const isA=turn%2===1;
    const atk=isA?f1:f2,def=isA?f2:f1;
    const aS=isA?s1:s2,dS=isA?s2:s1;
    const aEl=isA?fighterAEl:fighterBEl,dEl=isA?fighterBEl:fighterAEl;

    if(hp1<=35||hp2<=35)arenaWrapper.classList.add('intense');

    // ── Poison tick ──
    const myPoison=isA?poison1:poison2;
    if(myPoison>0){
      const pd=rand(3,6);
      if(isA){hp1=Math.max(0,hp1-pd);poison1--;updateHpBar(hpBarA,hpTextA,hp1,MAX_HP)}
      else{hp2=Math.max(0,hp2-pd);poison2--;updateHpBar(hpBarB,hpTextB,hp2,MAX_HP)}
      applyAnim(aEl,'poison-pulse',500);
      addLog('☠️',`${atk.name} סופג <b>${pd}</b> נזק רעל!`,'poison');
      if((isA?hp1:hp2)<=0)break;
      await new Promise(r=>setTimeout(r,250));
    }

    // ── Energy gain ──
    const nrgGain=rand(12,22);
    if(isA){nrg1=Math.min(MAX_NRG,nrg1+nrgGain);updateNrgBar(nrgBarA,nrgTextA,nrg1)}
    else{nrg2=Math.min(MAX_NRG,nrg2+nrgGain);updateNrgBar(nrgBarB,nrgTextB,nrg2)}

    const roll=Math.random()*100;
    const myNrg=isA?nrg1:nrg2;
    const myHp=isA?hp1:hp2;
    const myCombo=isA?combo1:combo2;

    // ── SPECIAL MOVE (energy >= 70) ──
    if(myNrg>=70&&roll<16){
      if(isA)nrg1-=70;else nrg2-=70;
      updateNrgBar(isA?nrgBarA:nrgBarB,isA?nrgTextA:nrgTextB,isA?nrg1:nrg2);
      const rawDmg=rand(20,32)+(aS.power/7);
      const dmg=Math.round(Math.max(5,rawDmg-(dS.defense/10)));
      addLog('⭐',`${atk.name} מפעיל <b>${pick(specialNames)}</b>!`,'special');
      applyAnim(aEl,isA?'satk-r':'satk-l',500);
      await new Promise(r=>setTimeout(r,250));
      applyAnim(dEl,'big-shake',500);applyAnim(dEl,'hit-flash',300);
      showPopup(dEl,'-'+dmg+' ⭐','special-pop');
      const c=getElCenter(dEl);spawnParticles(c.x,c.y,'#facc15',22);
      spawnTextParticle(c.x+rand(-30,30),c.y+rand(-20,20),'SPECIAL!','#fde68a');
      screenShake(true);
      if(isA){hp2=Math.max(0,hp2-dmg);updateHpBar(hpBarB,hpTextB,hp2,MAX_HP)}
      else{hp1=Math.max(0,hp1-dmg);updateHpBar(hpBarA,hpTextA,hp1,MAX_HP)}
      addLog('💫',`${def.name} ספג <b>${dmg}</b> נזק מיוחד!`,'special');
      if(isA)combo1=0;else combo2=0;
      if(Math.random()<0.4)addLog('📢',pick(crowdLines),'crowd');
      await new Promise(r=>setTimeout(r,TURN_DELAY));continue;
    }

    // ── HEAL (HP < 40, luck-based chance) ──
    if(myHp<40&&roll<(16+aS.luck/7)){
      const heal=rand(10,20);
      if(isA){hp1=Math.min(MAX_HP,hp1+heal);updateHpBar(hpBarA,hpTextA,hp1,MAX_HP)}
      else{hp2=Math.min(MAX_HP,hp2+heal);updateHpBar(hpBarB,hpTextB,hp2,MAX_HP)}
      applyAnim(aEl,'heal-glow',600);showPopup(aEl,'+'+heal+' HP','heal-pop');
      const c=getElCenter(aEl);spawnParticles(c.x,c.y,'#4ade80',12);
      addLog('💚',`${atk.name} ${pick(healLines)} <b>+${heal} HP</b>`,'heal');
      if(isA)combo1=0;else combo2=0;
      await new Promise(r=>setTimeout(r,TURN_DELAY));continue;
    }

    // ── BUFF (hype based, small chance) ──
    if(roll>93&&aS.hype>45){
      applyAnim(aEl,'buff-glow',600);
      const bStat=pick(['power','speed','chaos']);
      const bAmt=rand(5,14);aS[bStat]=Math.min(99,aS[bStat]+bAmt);
      renderStatBars(isA?statsAEl:statsBEl,aS);setStatus(aEl,'💪');
      const label={power:'כוח',speed:'מהירות',chaos:'כאוס'}[bStat];
      addLog('✨',`${atk.name} ${pick(buffLines)} — ${label} <b>+${bAmt}</b>!`,'buff');
      if(isA)combo1=0;else combo2=0;
      await new Promise(r=>setTimeout(r,TURN_DELAY));continue;
    }

    // ── POISON ATTACK (chaos based) ──
    const defPoison=isA?poison2:poison1;
    if(roll>87&&aS.chaos>50&&defPoison===0){
      applyAnim(aEl,isA?'atk-r':'atk-l',350);
      await new Promise(r=>setTimeout(r,200));
      applyAnim(dEl,'poison-pulse',500);
      const pTurns=rand(2,4);const pDmg=rand(4,9);
      if(isA)poison2=pTurns;else poison1=pTurns;
      if(isA){hp2=Math.max(0,hp2-pDmg);updateHpBar(hpBarB,hpTextB,hp2,MAX_HP)}
      else{hp1=Math.max(0,hp1-pDmg);updateHpBar(hpBarA,hpTextA,hp1,MAX_HP)}
      showPopup(dEl,'-'+pDmg+' ☠️','');
      setStatus(dEl,'☠️');
      const c=getElCenter(dEl);spawnParticles(c.x,c.y,'#a855f7',10);
      addLog('🧪',`${atk.name} — ${pick(poisonLines)} <b>-${pDmg}</b> + רעל ל-${pTurns} תורות!`,'poison');
      if(isA)combo1=0;else combo2=0;
      await new Promise(r=>setTimeout(r,TURN_DELAY));continue;
    }

    // ── DODGE ──
    const dodgeChance=dS.speed/350;
    if(Math.random()<dodgeChance){
      addLog('💨',`${def.name} ${pick(dodgeLines)}`,'dodge');
      if(isA)combo1=0;else combo2=0;
      await new Promise(r=>setTimeout(r,TURN_DELAY));continue;
    }

    // ── NORMAL ATTACK ──
    const baseDmg=rand(6,14)+(aS.power/8);
    const isCrit=Math.random()<(aS.chaos/200);
    let dmg=Math.round(Math.max(3,((isCrit?baseDmg*1.9:baseDmg)-(dS.defense/12))));
    const moveName=pick(atkNames);

    // Combo chain
    if(isA)combo1++;else combo2++;
    const curCombo=isA?combo1:combo2;
    let isCombo=curCombo>=3;
    if(isCombo)dmg=Math.round(dmg*1.4);

    applyAnim(aEl,isA?'atk-r':'atk-l',350);
    await new Promise(r=>setTimeout(r,180));
    applyAnim(dEl,isCrit||isCombo?'big-shake':'shake',isCrit||isCombo?500:400);
    applyAnim(dEl,'hit-flash',300);

    const popText=isCombo?'-'+dmg+' 🌀':isCrit?'💥-'+dmg:'-'+dmg;
    const popCls=isCombo?'combo-pop':isCrit?'special-pop':'';
    showPopup(dEl,popText,popCls);

    const c=getElCenter(dEl);
    spawnParticles(c.x,c.y,isCrit?'#facc15':isCombo?'#f472b6':'#ef4444',isCrit||isCombo?18:8);
    if(isCrit||isCombo)screenShake(isCrit&&isCombo);

    if(isA){hp2=Math.max(0,hp2-dmg);updateHpBar(hpBarB,hpTextB,hp2,MAX_HP)}
    else{hp1=Math.max(0,hp1-dmg);updateHpBar(hpBarA,hpTextA,hp1,MAX_HP)}

    const logCls=isA?'hit-a':'hit-b';
    addLog('⚔️',`${atk.name} — <b>${moveName}</b> על ${def.name} → <b>-${dmg} HP</b>`,logCls);
    if(isCrit)addLog('💥',pick(critLines),'critical');
    if(isCombo){
      addLog('🌀',`קומבו x${curCombo}! נזק מוגבר!`,'combo');
      spawnTextParticle(c.x+rand(-20,20),c.y-20,`COMBO x${curCombo}!`,'#f472b6');
    }

    // ── COUNTER ATTACK (defender's luck) ──
    if(Math.random()<(dS.luck/300)&&(isA?hp2:hp1)>0){
      await new Promise(r=>setTimeout(r,200));
      const cDmg=rand(4,10);
      applyAnim(dEl,isA?'atk-l':'atk-r',350);
      await new Promise(r=>setTimeout(r,180));
      applyAnim(aEl,'shake',400);applyAnim(aEl,'hit-flash',300);
      showPopup(aEl,'-'+cDmg+' ↩️','');
      const ac=getElCenter(aEl);spawnParticles(ac.x,ac.y,'#fb923c',10);
      if(isA){hp1=Math.max(0,hp1-cDmg);updateHpBar(hpBarA,hpTextA,hp1,MAX_HP)}
      else{hp2=Math.max(0,hp2-cDmg);updateHpBar(hpBarB,hpTextB,hp2,MAX_HP)}
      addLog('↩️',`${def.name} ${pick(counterLines)} <b>-${cDmg} HP</b>`,'counter');
    }

    await new Promise(r=>setTimeout(r,80));
    dEl.classList.remove('hit-flash','shake','big-shake');

    if(Math.random()<0.22)addLog('📢',pick(crowdLines),'crowd');
    await new Promise(r=>setTimeout(r,TURN_DELAY));
  }

  vsText.classList.remove('fire');arenaWrapper.classList.remove('intense');

  // Determine winner
  let winner,loser,wEl,lEl;
  if(hp1<=0){winner=f2;loser=f1;wEl=fighterBEl;lEl=fighterAEl}
  else if(hp2<=0){winner=f1;loser=f2;wEl=fighterAEl;lEl=fighterBEl}
  else{winner=hp1>=hp2?f1:f2;loser=winner===f1?f2:f1;wEl=winner===f1?fighterAEl:fighterBEl;lEl=winner===f1?fighterBEl:fighterAEl}

  // KO animation
  applyAnim(lEl,'ko-spin',800);
  addLog('🏆',`<b>${winner.name}</b> מנצח את <b>${loser.name}</b>! ${getEmoji(winner.name)}`,'ko');
  screenShake(true);
  const wc=getElCenter(wEl);spawnParticles(wc.x,wc.y,'#facc15',25);
  spawnTextParticle(wc.x,wc.y-30,'WINNER!','#fde68a');

  wEl.classList.add('winner-glow');
  await new Promise(r=>setTimeout(r,1500));
  wEl.classList.remove('winner-glow');lEl.classList.remove('ko-spin');lEl.classList.add('loser-fade');
  await new Promise(r=>setTimeout(r,400));
  lEl.classList.remove('loser-fade');
  setStatus(fighterAEl,null);setStatus(fighterBEl,null);

  return{winner,loser};
}

function startTournament(){
  const foods=normalizeFoods(foodInput.value);
  if(foods.length<2){alert('צריך לפחות 2 אפשרויות אוכל כדי להתחיל טורניר.');return}
  stopAutoRun();
  allFoods=buildFoodObjects(foods);eliminatedFoods=new Set();
  currentRound=[...allFoods];nextRound=[];currentMatch=0;roundNumber=1;totalMatchesPlayed=0;currentPair=null;isBusy=false;
  battleLogContainer.style.display='none';battleLogBody.innerHTML='';
  winnerBox.classList.remove('active');battleArea.classList.add('active');
  playNextMatch();updateBtns();
  battleArea.scrollIntoView({behavior:'smooth',block:'start'});
}

function playNextMatch(){
  if(currentRound.length===1){showChampion(currentRound[0]);return}
  if(currentMatch>=currentRound.length){currentRound=nextRound;nextRound=[];currentMatch=0;roundNumber++}
  if(currentRound.length===1){showChampion(currentRound[0]);return}
  if(currentMatch===currentRound.length-1){nextRound.push(currentRound[currentMatch]);currentMatch++;playNextMatch();return}

  const f1=currentRound[currentMatch],f2=currentRound[currentMatch+1];
  currentPair=[f1,f2];

  foodAEl.textContent=f1.name;foodBEl.textContent=f2.name;
  emojiAEl.textContent=getEmoji(f1.name);emojiBEl.textContent=getEmoji(f2.name);
  scoreAEl.textContent=`ניצחונות: ${f1.wins}`;scoreBEl.textContent=`ניצחונות: ${f2.wins}`;
  renderStatBars(statsAEl,{...f1.stats});renderStatBars(statsBEl,{...f2.stats});
  updateHpBar(hpBarA,hpTextA,MAX_HP,MAX_HP);updateHpBar(hpBarB,hpTextB,MAX_HP,MAX_HP);
  updateNrgBar(nrgBarA,nrgTextA,0);updateNrgBar(nrgBarB,nrgTextB,0);
  progressText.textContent=`סיבוב ${roundNumber} · קרב ${Math.floor(currentMatch/2)+1}`;
  vsText.textContent='VS';
  fighterAEl.className='fighter';fighterBEl.className='fighter';
  setStatus(fighterAEl,null);setStatus(fighterBEl,null);
  updateBracket();updateBtns();
}

async function fightCurrentMatch(){
  if(!currentPair||isBusy||winnerBox.classList.contains('active'))return;
  isBusy=true;updateBtns();
  const result=await animatedFight(currentPair[0],currentPair[1]);
  result.winner.wins++;eliminatedFoods.add(result.loser.name);
  nextRound.push(result.winner);currentMatch+=2;totalMatchesPlayed++;
  scoreAEl.textContent=`ניצחונות: ${currentPair[0].wins}`;
  scoreBEl.textContent=`ניצחונות: ${currentPair[1].wins}`;
  updateBracket();isBusy=false;
  await new Promise(r=>setTimeout(r,700));
  playNextMatch();updateBtns();
}

async function skipFight(){
  if(!currentPair||isBusy||winnerBox.classList.contains('active'))return;
  isBusy=true;updateBtns();
  const s1=currentPair[0].stats,s2=currentPair[1].stats;
  const t1=s1.power*.3+s1.speed*.2+s1.hype*.2+s1.chaos*.1+s1.luck*.1+s1.defense*.1+Math.random()*25;
  const t2=s2.power*.3+s2.speed*.2+s2.hype*.2+s2.chaos*.1+s2.luck*.1+s2.defense*.1+Math.random()*25;
  const winner=t1>=t2?currentPair[0]:currentPair[1];
  const loser=winner===currentPair[0]?currentPair[1]:currentPair[0];
  winner.wins++;eliminatedFoods.add(loser.name);nextRound.push(winner);currentMatch+=2;totalMatchesPlayed++;

  const wEl=winner===currentPair[0]?fighterAEl:fighterBEl;
  const lEl=winner===currentPair[0]?fighterBEl:fighterAEl;
  updateHpBar(winner===currentPair[0]?hpBarB:hpBarA,winner===currentPair[0]?hpTextB:hpTextA,0,MAX_HP);
  wEl.classList.add('winner-glow');lEl.classList.add('loser-fade');
  battleLogContainer.style.display='block';battleLogBody.innerHTML='';
  addLog('⚡',`${winner.name} ניצח את ${loser.name} בקרב מהיר!`,'ko');
  scoreAEl.textContent=`ניצחונות: ${currentPair[0].wins}`;
  scoreBEl.textContent=`ניצחונות: ${currentPair[1].wins}`;
  updateBracket();
  await new Promise(r=>setTimeout(r,600));
  wEl.classList.remove('winner-glow');lEl.classList.remove('loser-fade');
  isBusy=false;playNextMatch();updateBtns();
}

function runWholeTournament(){
  if(winnerBox.classList.contains('active')||!currentPair||isBusy)return;
  stopAutoRun();
  async function step(){
    if(winnerBox.classList.contains('active')){stopAutoRun();return}
    if(!isBusy&&currentPair){await fightCurrentMatch();if(!winnerBox.classList.contains('active'))autoRunId=setTimeout(step,400)}
  }
  step();
}

function showChampion(champion){
  stopAutoRun();currentPair=null;
  winnerNameEl.textContent=`${getEmoji(champion.name)} ${champion.name}`;
  winnerTextEl.textContent=`אחרי ${totalMatchesPlayed} קרבות, הצוות הכריע: היום אוכלים ${champion.name}. אין ערעורים, אין RFC, ואין עוד ישיבה.`;
  const sorted=[...allFoods].sort((a,b)=>b.wins-a.wins||a.name.localeCompare(b.name,'he'));
  rankingEl.innerHTML=sorted.map((f,i)=>`<div class="rank-item" style="animation:logIn .5s ease ${i*0.1}s both"><div class="rank-left"><span>${i===0?'🥇':i===1?'🥈':i===2?'🥉':'🍽️'}</span><span>${f.name}</span></div><div class="muted">${f.wins} ניצחונות</div></div>`).join('');
  winnerBox.classList.add('active');spawnConfetti();updateBracket();updateBtns();
}

sampleBtn.addEventListener('click',()=>{foodInput.value=['פיצה','סושי','שווארמה','המבורגר','סביח','פלאפל','פסטה','שקשוקה'].join('\n')});
clearBtn.addEventListener('click',()=>{foodInput.value='';foodInput.focus()});
startBtn.addEventListener('click',startTournament);
restartBtn.addEventListener('click',startTournament);
fightBtn.addEventListener('click',fightCurrentMatch);
skipBtn.addEventListener('click',skipFight);
autoAllBtn.addEventListener('click',runWholeTournament);
updateBtns();

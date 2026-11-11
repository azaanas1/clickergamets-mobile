/* ClickerGameTS v2.0 — The Farm Update
   Legacy v1.x keys are preserved for migration. Farm data uses cgt20_* keys.
   Offline progression is intentionally disabled. */
"use strict";
(() => {
  const $ = id => document.getElementById(id);
  const SAVE_VERSION = 20;
  const PRESTIGE_REQUIREMENT = 5000;
  const COMBO_TIMEOUT = 1500;
  const SAVE_DEBOUNCE_MS = 500;
  const CRIT_CHANCE = 0.15;
  const CRIT_MULTIPLIER = 5;
  const LEGACY_KEYS = [
    "game_clicks","click_power","auto_clickers","quantum_chips","cost_super","cost_auto","cost_chip",
    "prestige_count","prestige_mult","total_clicks","manual_clicks","critical_hits","best_combo",
    "game_user","app_theme","save_version","cgt133_total_upgrades","cgt133_unlocked_milestones"
  ];
  const FARM_KEY = "cgt20_farm";
  const SEEDS = {
    carrot:{name:"Carrot",emoji:"🥕",cost:120,grow:20,reward:250},
    wheat:{name:"Wheat",emoji:"🌾",cost:350,grow:35,reward:700},
    strawberry:{name:"Strawberry",emoji:"🍓",cost:900,grow:50,reward:1900},
    pumpkin:{name:"Pumpkin",emoji:"🎃",cost:2200,grow:75,reward:5000}
  };
  const DEFAULTS = {
    clicks:0,clickPower:1,autoClickers:0,quantumChips:0,superCost:25,autoCost:100,chipCost:500,
    prestigeCount:0,prestigeMult:1,totalClicks:0,manualClicks:0,criticalHits:0,bestCombo:0,
    username:"Clicker",theme:"light",totalUpgrades:0,unlockedMilestones:[],combo:0,comboMultiplier:1,
    farm:{plots:[null,null,null,null],extraPlots:0,waterLevel:0,cropsHarvested:0,farmEarned:0,seedsPlanted:0}
  };
  let state = structuredClone(DEFAULTS);
  let comboTimer = null, saveTimer = null, lastClickAt = 0, lastTick = Date.now();

  function safeGet(k){try{return localStorage.getItem(k)}catch(_){return null}}
  function safeSet(k,v){try{localStorage.setItem(k,String(v));return true}catch(_){setSaveStatus("Save unavailable — browser storage may be blocked/full.");return false}}
  function safeRemove(k){try{localStorage.removeItem(k)}catch(_){}}
  function numberStored(k,fallback,min=0){const v=Number(safeGet(k));return safeGet(k)!==null&&Number.isFinite(v)&&v>=min?v:fallback}
  function setSaveStatus(message){const a=$("save-status"),b=$("settings-save-status");if(a)a.textContent=message;if(b)b.textContent=message}
  function fmt(n){if(!Number.isFinite(n))return "0";if(n<1000)return Math.floor(n).toLocaleString();const units=["K","M","B","T","Qa","Qi"];let i=-1;while(n>=1000&&i<units.length-1){n/=1000;i++}return n.toFixed(n>=100?0:n>=10?1:2)+units[i]}
  function exact(n){return Math.floor(n).toLocaleString()}
  function toast(msg){const region=$("toast-region");if(!region)return;const node=document.createElement("div");node.className="toast";node.textContent=msg;region.appendChild(node);setTimeout(()=>node.remove(),3000)}
  function safeJSON(raw){try{return JSON.parse(raw)}catch(_){return null}}

  function load(){
    state.clicks=numberStored("game_clicks",0);state.clickPower=numberStored("click_power",1,1);
    state.autoClickers=numberStored("auto_clickers",0);state.quantumChips=numberStored("quantum_chips",0);
    state.superCost=numberStored("cost_super",25,1);state.autoCost=numberStored("cost_auto",100,1);state.chipCost=numberStored("cost_chip",500,1);
    state.prestigeCount=numberStored("prestige_count",0);state.prestigeMult=numberStored("prestige_mult",1,1);
    state.totalClicks=numberStored("total_clicks",state.clicks);state.manualClicks=numberStored("manual_clicks",0);
    state.criticalHits=numberStored("critical_hits",0);state.bestCombo=numberStored("best_combo",0);
    state.username=(safeGet("game_user")||"Clicker").slice(0,24);
    state.theme=safeGet("app_theme")==="dark"?"dark":"light";
    state.totalUpgrades=numberStored("cgt133_total_upgrades",0);
    state.unlockedMilestones=safeJSON(safeGet("cgt133_unlocked_milestones"))||[];
    const farm=safeJSON(safeGet(FARM_KEY));
    if(farm&&typeof farm==="object"){
      const plots=Array.isArray(farm.plots)?farm.plots.slice(0,12):state.farm.plots;
      state.farm={...state.farm,...farm,plots};
      while(state.farm.plots.length<4)state.farm.plots.push(null);
      state.farm.plots=state.farm.plots.map(p=>p&&SEEDS[p.seed]?{seed:p.seed,plantedAt:Date.now()-Math.max(0,Number(p.elapsed)||0),elapsed:Math.max(0,Number(p.elapsed)||0)}:null);
      state.farm.extraPlots=Math.max(0,Math.min(8,Number(state.farm.extraPlots)||0));
      state.farm.waterLevel=Math.max(0,Math.min(20,Number(state.farm.waterLevel)||0));
    }
    document.documentElement.dataset.theme=state.theme;
    $("username-input").value=state.username;
    $("welcome-banner").textContent=`Welcome back, ${state.username}.`;
    safeSet("save_version",SAVE_VERSION);
  }
  function persistNow(){
    const pairs={
      game_clicks:state.clicks,click_power:state.clickPower,auto_clickers:state.autoClickers,quantum_chips:state.quantumChips,
      cost_super:state.superCost,cost_auto:state.autoCost,cost_chip:state.chipCost,prestige_count:state.prestigeCount,
      prestige_mult:state.prestigeMult,total_clicks:state.totalClicks,manual_clicks:state.manualClicks,
      critical_hits:state.criticalHits,best_combo:state.bestCombo,game_user:state.username,app_theme:state.theme,
      save_version:SAVE_VERSION,cgt133_total_upgrades:state.totalUpgrades,
      cgt133_unlocked_milestones:JSON.stringify(state.unlockedMilestones),
      [FARM_KEY]:JSON.stringify({...state.farm,plots:state.farm.plots.map(p=>p?{seed:p.seed,elapsed:cropElapsed(p)}:null)})
    };
    let ok=true;for(const [k,v] of Object.entries(pairs))if(!safeSet(k,v))ok=false;
    if(ok)setSaveStatus("All progress saved");
  }
  function saveSoon(){setSaveStatus("Saving…");clearTimeout(saveTimer);saveTimer=setTimeout(persistNow,SAVE_DEBOUNCE_MS)}
  function totalPlots(){return 4+state.farm.extraPlots}
  function cropElapsed(p){return p?Math.max(0,Date.now()-(p.plantedAt||Date.now())):0}
  function cropDuration(seed){return SEEDS[seed].grow*1000/Math.pow(1.2,state.farm.waterLevel)}
  function cropProgress(p){if(!p)return 0;return Math.min(1,cropElapsed(p)/cropDuration(p.seed))}
  function isReady(p){return !!p&&cropProgress(p)>=1}
  function passiveRate(){return (state.autoClickers+state.quantumChips*5)*state.prestigeMult}

  function addClicks(amount,manual=false){
    if(!Number.isFinite(amount)||amount<=0)return;
    state.clicks+=amount;state.totalClicks+=amount;if(manual)state.manualClicks+=amount;
    renderStats();saveSoon();
  }
  function doClick(){
    const now=Date.now();
    if(now-lastClickAt<=COMBO_TIMEOUT){state.combo++;state.comboMultiplier=Math.min(2,1+state.combo*0.025)}else{state.combo=1;state.comboMultiplier=1}
    lastClickAt=now;state.bestCombo=Math.max(state.bestCombo,state.combo);
    clearTimeout(comboTimer);comboTimer=setTimeout(()=>{state.combo=0;state.comboMultiplier=1;renderStats()},COMBO_TIMEOUT);
    const crit=Math.random()<CRIT_CHANCE;const gain=state.clickPower*state.prestigeMult*state.comboMultiplier*(crit?CRIT_MULTIPLIER:1);
    if(crit){state.criticalHits++;toast(`Critical hit! +${fmt(gain)} clicks`)}
    addClicks(gain,true);$("combo-display").textContent=`Combo ×${state.comboMultiplier.toFixed(2)}`;
    $("combo-bonus-text").textContent=crit?"CRITICAL HIT!":`${state.combo} click${state.combo===1?"":"s"} in combo`;
    $("combo-progress").style.width=`${Math.min(100,(state.combo/40)*100)}%`;
    $("my-btn").animate?.([{transform:"scale(1)"},{transform:"scale(.98)"},{transform:"scale(1)"}],{duration:100});
    checkMilestones();
  }
  function buy(kind){
    const costKey={super:"superCost",auto:"autoCost",chip:"chipCost"}[kind];const cost=state[costKey];
    if(state.clicks<cost){toast(`You need ${fmt(cost-state.clicks)} more clicks.`);return}
    state.clicks-=cost;state.totalUpgrades++;
    if(kind==="super"){state.clickPower++;state.superCost=Math.ceil(state.superCost*1.65)}
    if(kind==="auto"){state.autoClickers++;state.autoCost=Math.ceil(state.autoCost*1.75)}
    if(kind==="chip"){state.quantumChips++;state.chipCost=Math.ceil(state.chipCost*2.1)}
    toast("Upgrade purchased!");renderAll();checkMilestones();saveSoon();
  }
  function prestige(){
    if(state.clicks<PRESTIGE_REQUIREMENT){toast(`You need ${fmt(PRESTIGE_REQUIREMENT-state.clicks)} more clicks to prestige.`);return}
    if(!confirm("Prestige resets your current clicks and shop progress, but keeps lifetime stats, farm progress, and prestige bonuses. Continue?"))return;
    state.prestigeCount++;state.prestigeMult=1+state.prestigeCount*.25;
    state.clicks=0;state.clickPower=1;state.autoClickers=0;state.quantumChips=0;
    state.superCost=25;state.autoCost=100;state.chipCost=500;state.totalUpgrades=0;
    toast(`Prestige ${state.prestigeCount} complete! Multiplier ×${state.prestigeMult.toFixed(2)}`);
    renderAll();checkMilestones();saveSoon();
  }
  function resetGame(){
    if(!confirm("Reset all ClickerGameTS v2.0 progress, including your farm? Export a save first if you want a backup."))return;
    for(const k of LEGACY_KEYS)safeRemove(k);safeRemove(FARM_KEY);
    state=structuredClone(DEFAULTS);state.farm.plots=[null,null,null,null];
    document.documentElement.dataset.theme="light";$("username-input").value="Clicker";
    lastClickAt=0;clearTimeout(comboTimer);renderAll();persistNow();toast("Game reset.");
  }
  const MILESTONES=[
    {id:"click100",name:"First hundred",desc:"Earn 100 current clicks.",test:()=>state.clicks>=100,reward:100},
    {id:"click10k",name:"Click millionaire",desc:"Reach 10,000 lifetime clicks.",test:()=>state.totalClicks>=10000,reward:500},
    {id:"upgrades10",name:"Mechanic",desc:"Buy 10 upgrades.",test:()=>state.totalUpgrades>=10,reward:500},
    {id:"prestige1",name:"New tide",desc:"Prestige for the first time.",test:()=>state.prestigeCount>=1,reward:1000},
    {id:"harvest1",name:"Green thumb",desc:"Harvest your first crop.",test:()=>state.farm.cropsHarvested>=1,reward:300},
    {id:"harvest25",name:"Farmhand",desc:"Harvest 25 crops.",test:()=>state.farm.cropsHarvested>=25,reward:2500},
    {id:"pumpkin",name:"Pumpkin season",desc:"Harvest a pumpkin.",test:()=>state.farm.pumpkinHarvested===true,reward:2000},
    {id:"prestige10",name:"Tsunami",desc:"Reach 10 prestiges.",test:()=>state.prestigeCount>=10,reward:5000}
  ];
  function checkMilestones(){
    for(const m of MILESTONES){if(m.test()&&!state.unlockedMilestones.includes(m.id)){state.unlockedMilestones.push(m.id);state.clicks+=m.reward;state.totalClicks+=m.reward;toast(`Milestone unlocked: ${m.name} (+${fmt(m.reward)} clicks)`)}}
    renderMilestones();
  }
  function renderMilestones(){
    const box=$("milestone-list");box.replaceChildren();
    for(const m of MILESTONES){const unlocked=state.unlockedMilestones.includes(m.id);const div=document.createElement("div");div.className="milestone-item"+(unlocked?" unlocked":"");const title=document.createElement("strong");title.textContent=(unlocked?"✅ ":"🔒 ")+m.name;const p=document.createElement("p");p.textContent=unlocked?`${m.desc} Reward claimed.`:`${m.desc} Reward: ${fmt(m.reward)} clicks.`;div.append(title,p);box.append(div)}
    $("achievement-badge").textContent=`${state.unlockedMilestones.length} unlocked`;
    $("achievement-list").textContent=state.unlockedMilestones.join(", ");
  }
  function renderFarm(){
    $("plots-available").textContent=totalPlots()-state.farm.plots.filter(Boolean).length;
    $("crops-harvested").textContent=fmt(state.farm.cropsHarvested);$("farm-earned").textContent=fmt(state.farm.farmEarned);
    $("farm-level").textContent=`Farm level ${1+state.farm.waterLevel+state.farm.extraPlots}`;
    $("water-level").textContent=state.farm.waterLevel;
    $("plot-cost").textContent=fmt(2000*Math.pow(2,state.farm.extraPlots));
    $("water-cost").textContent=fmt(1500*Math.pow(2,state.farm.waterLevel));
    const shop=$("seed-shop");shop.replaceChildren();
    for(const [key,s] of Object.entries(SEEDS)){
      const row=document.createElement("div");row.className="seed-item";
      const icon=document.createElement("span");icon.className="seed-emoji";icon.textContent=s.emoji;
      const info=document.createElement("div");info.className="seed-info";
      const name=document.createElement("strong");name.textContent=s.name;
      const desc=document.createElement("small");desc.textContent=`Seed ${fmt(s.cost)} · ${Math.round(cropDuration(key)/1000)}s · Harvest ${fmt(s.reward)}`;
      const btn=document.createElement("button");btn.className="buy-button";btn.textContent="Plant";btn.disabled=state.clicks<s.cost||state.farm.plots.slice(0,totalPlots()).every(Boolean);btn.addEventListener("click",()=>plant(key));
      info.append(name,desc);row.append(icon,info,btn);shop.append(row);
    }
    const plots=$("farm-plots");plots.replaceChildren();
    for(let i=0;i<totalPlots();i++){
      const p=state.farm.plots[i];const card=document.createElement("div");card.className="farm-plot"+(!p?" empty":"");
      if(!p){const icon=document.createElement("span");icon.className="plot-crop";icon.textContent="🟫";const name=document.createElement("strong");name.textContent=`Empty plot ${i+1}`;const hint=document.createElement("small");hint.textContent="Choose a seed from the shop";card.append(icon,name,hint)}
      else{
        const s=SEEDS[p.seed],progress=cropProgress(p),ready=progress>=1;
        const icon=document.createElement("span");icon.className="plot-crop";icon.textContent=ready?"✨":s.emoji;
        const name=document.createElement("strong");name.textContent=ready?`${s.name} is ready!`:`Growing ${s.name}`;
        const hint=document.createElement("small");hint.textContent=ready?`Harvest +${fmt(s.reward)} clicks`:`${Math.max(0,Math.ceil((cropDuration(p.seed)-cropElapsed(p))/1000))} seconds remaining`;
        const track=document.createElement("div");track.className="plot-progress";const fill=document.createElement("span");fill.style.width=`${progress*100}%`;track.append(fill);card.append(icon,name,hint,track);
        if(ready){const actions=document.createElement("div");actions.className="plot-actions";const harvest=document.createElement("button");harvest.textContent="Harvest";harvest.addEventListener("click",()=>harvestCrop(i));const discard=document.createElement("button");discard.textContent="Remove";discard.addEventListener("click",()=>removeCrop(i));actions.append(harvest,discard);card.append(actions)}
      }
      plots.append(card);
    }
    $("buy-plot").disabled=state.farm.extraPlots>=8||state.clicks<2000*Math.pow(2,state.farm.extraPlots);
    $("buy-water").disabled=state.farm.waterLevel>=20||state.clicks<1500*Math.pow(2,state.farm.waterLevel);
  }
  function plant(seed){
    const s=SEEDS[seed];if(!s||state.clicks<s.cost)return;
    const idx=state.farm.plots.slice(0,totalPlots()).findIndex(p=>!p);if(idx<0){toast("No empty plots. Harvest a crop or unlock another plot.");return}
    state.clicks-=s.cost;state.farm.plots[idx]={seed,plantedAt:Date.now()};state.farm.seedsPlanted++;
    toast(`${s.name} planted in plot ${idx+1}.`);renderAll();saveSoon();
  }
  function harvestCrop(i){
    const p=state.farm.plots[i];if(!p||!isReady(p))return;
    const s=SEEDS[p.seed];let reward=s.reward*state.prestigeMult;
    if(p.seed==="pumpkin")state.farm.pumpkinHarvested=true;
    state.farm.plots[i]=null;state.farm.cropsHarvested++;state.farm.farmEarned+=reward;
    addClicks(reward,false);toast(`Harvested ${s.name}! +${fmt(reward)} clicks.`);checkMilestones();renderAll();saveSoon();
  }
  function removeCrop(i){if(!state.farm.plots[i])return;if(!confirm("Remove this growing crop? The seed cost will not be refunded."))return;state.farm.plots[i]=null;renderAll();saveSoon()}
  function buyPlot(){const cost=2000*Math.pow(2,state.farm.extraPlots);if(state.farm.extraPlots>=8||state.clicks<cost)return;state.clicks-=cost;state.farm.extraPlots++;state.farm.plots.push(null);toast("New plot unlocked!");renderAll();saveSoon()}
  function buyWater(){const cost=1500*Math.pow(2,state.farm.waterLevel);if(state.farm.waterLevel>=20||state.clicks<cost)return;state.clicks-=cost;state.farm.waterLevel++;toast("Watering upgraded. Crops grow faster!");renderAll();saveSoon()}
  function renderStats(){
    $("counter-display").textContent=fmt(state.clicks);$("power-display").textContent=fmt(state.clickPower*state.prestigeMult);
    $("super-cost-text").textContent=fmt(state.superCost);$("auto-cost-text").textContent=fmt(state.autoCost);$("chip-cost-text").textContent=fmt(state.chipCost);
    $("super-owned").textContent=fmt(state.clickPower-1);$("auto-owned").textContent=fmt(state.autoClickers);$("chip-owned").textContent=fmt(state.quantumChips);
    $("buy-super-click").disabled=state.clicks<state.superCost;$("buy-auto-click").disabled=state.clicks<state.autoCost;$("buy-quantum-chip").disabled=state.clicks<state.chipCost;
    $("total-clicks-stat").textContent=fmt(state.totalClicks);$("best-combo-stat").textContent=fmt(state.bestCombo);$("crit-stat").textContent=fmt(state.criticalHits);$("multiplier-stat").textContent=`×${state.prestigeMult.toFixed(2)}`;
    $("prestige-info").textContent=state.clicks>=PRESTIGE_REQUIREMENT?`Ready! Prestige ${state.prestigeCount+1} grants ×${(state.prestigeMult+.25).toFixed(2)} multiplier.`:`Earn ${fmt(PRESTIGE_REQUIREMENT)} clicks to prestige. Current multiplier ×${state.prestigeMult.toFixed(2)}.`;
    $("prestige-btn").disabled=state.clicks<PRESTIGE_REQUIREMENT;
    $("passive-rate").textContent=fmt(passiveRate());
    $("analytics-harvested").textContent=fmt(state.farm.cropsHarvested);$("analytics-farm-earned").textContent=fmt(state.farm.farmEarned);
    $("production-overview").textContent=`You have earned ${fmt(state.totalClicks)} lifetime clicks, purchased ${fmt(state.totalUpgrades)} upgrades, harvested ${fmt(state.farm.cropsHarvested)} crops, and prestiged ${state.prestigeCount} time${state.prestigeCount===1?"":"s"}.`;
    $("welcome-banner").textContent=`Welcome back, ${state.username||"clicker"}.`;
  }
  function renderAll(){renderStats();renderFarm();renderMilestones();$("theme-toggle-btn").textContent=state.theme==="dark"?"Switch to light theme":"Switch to dark theme"}
  
let changelogLoaded = false;

async function loadChangelog() {
  const container = $("changelog-content");
  if (!container || changelogLoaded) return;

  container.innerHTML = '<p class="muted">Loading version history...</p>';

  try {
    const response = await fetch("./changelog.html");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    container.innerHTML = await response.text();
    changelogLoaded = true;
  } catch (error) {
    container.textContent = `Failed to load changelog: ${error.message}`;
  }
}

function switchPage(name){
    const valid=["dashboard","farm","analytics","settings","changelog"].includes(name)?name:"dashboard";
    document.querySelectorAll(".page").forEach(p=>p.classList.toggle("active-page",p.id===`page-${valid}`));
    document.querySelectorAll(".nav-link").forEach(a=>a.classList.toggle("active-link",a.dataset.page===valid));
    const page=$(`page-${valid}`);$("page-title").innerHTML=`ClickerGameTS <span>v2.0</span>`;
    $("page-subtitle").textContent=page.dataset.subtitle;
    if(location.hash!==`#${valid}`)history.replaceState(null,"",`#${valid}`);
    if(valid==="farm")renderFarm();
  if(valid==="changelog")loadChangelog();
  }
  function exportSave(){
    persistNow();const payload={format:"ClickerGameTS-save",version:2,exportedAt:new Date().toISOString(),data:{}};
    for(const key of [...LEGACY_KEYS,FARM_KEY])payload.data[key]=safeGet(key);
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`clickergamets-v2-save-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(url);toast("Save exported.");
  }
  async function importSave(file){
    if(!file)return;
    try{
      const obj=JSON.parse(await file.text());
      if(obj.format!=="ClickerGameTS-save"||!obj.data||typeof obj.data!=="object")throw new Error("This is not a ClickerGameTS save file.");
      if(!confirm("Importing replaces your current local progress. Continue?"))return;
      for(const k of [...LEGACY_KEYS,FARM_KEY]){if(Object.prototype.hasOwnProperty.call(obj.data,k)&&obj.data[k]!==null)safeSet(k,obj.data[k]);else safeRemove(k)}
      state=structuredClone(DEFAULTS);load();renderAll();persistNow();toast("Save imported successfully.");
    }catch(e){toast(e.message||"Could not import that save file.")}finally{$("import-save-file").value=""}
  }

  $("my-btn").addEventListener("click",doClick);
  $("buy-super-click").addEventListener("click",()=>buy("super"));
  $("buy-auto-click").addEventListener("click",()=>buy("auto"));
  $("buy-quantum-chip").addEventListener("click",()=>buy("chip"));
  $("prestige-btn").addEventListener("click",prestige);
  $("reset-btn").addEventListener("click",resetGame);
  $("buy-plot").addEventListener("click",buyPlot);$("buy-water").addEventListener("click",buyWater);
  $("username-input").addEventListener("change",e=>{state.username=e.target.value.trim().slice(0,24)||"Clicker";e.target.value=state.username;renderStats();saveSoon()});
  $("theme-toggle-btn").addEventListener("click",()=>{state.theme=state.theme==="dark"?"light":"dark";document.documentElement.dataset.theme=state.theme;renderAll();saveSoon()});
  $("export-save").addEventListener("click",exportSave);
  $("import-save-file").addEventListener("change",e=>importSave(e.target.files?.[0]));
  document.querySelectorAll(".nav-link[data-page]").forEach(a =>
  a.addEventListener("click", e => {
    e.preventDefault();
    switchPage(a.dataset.page);
  })
);
  window.addEventListener("hashchange",()=>switchPage(location.hash.slice(1)));
  window.addEventListener("storage",e=>{if([...LEGACY_KEYS,FARM_KEY].includes(e.key)){state=structuredClone(DEFAULTS);load();renderAll()}});
  document.addEventListener("visibilitychange",()=>{if(document.hidden){clearTimeout(saveTimer);persistNow()}});
  window.addEventListener("pagehide",()=>{clearTimeout(saveTimer);persistNow()});

  load();renderAll();switchPage(location.hash.slice(1));
  setInterval(()=>{
    const now=Date.now(),delta=Math.min(2,Math.max(0,(now-lastTick)/1000));lastTick=now;
    const rate=passiveRate();if(rate>0&&delta>0){state.clicks+=rate*delta;state.totalClicks+=rate*delta}
    if(state.farm.plots.some(p=>p&&!isReady(p))){renderFarm()}
    renderStats();checkMilestones();
    if(rate>0||state.farm.plots.some(Boolean))saveSoon();
  },1000);
  // Initial version migration is non-destructive: legacy keys remain intact.
  safeSet("save_version",SAVE_VERSION);
})();
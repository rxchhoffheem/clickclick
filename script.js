// Main clicker with multi-buy upgrades, pagination (pages of upgrades), badges, and rebirths.
// Persistent state held in localStorage under key 'sim_state_v2'

const CLICKER = document.getElementById('clicker');
const MONEY_EL = document.getElementById('money');
const CPS_EL = document.getElementById('cps');

const OPEN_SHOP = document.getElementById('open-shop');
const SHOP_OVERLAY = document.getElementById('shop-overlay');
const CLOSE_SHOP = document.getElementById('close-shop');
const CLOSE_SHOP_2 = document.getElementById('close-shop-2');
const UPGRADES_LIST = document.getElementById('upgrades-list');
const SHOP_BALANCE = document.getElementById('shop-balance');
const PREV_PAGE = document.getElementById('prev-page');
const NEXT_PAGE = document.getElementById('next-page');
const PAGE_INDICATOR = document.getElementById('page-indicator');

const OPEN_BADGES = document.getElementById('open-badges');
const BADGES_OVERLAY = document.getElementById('badges-overlay');
const CLOSE_BADGES = document.getElementById('close-badges');
const CLOSE_BADGES_2 = document.getElementById('close-badges-2');
const BADGES_LIST = document.getElementById('badges-list');

const OPEN_REBIRTH = document.getElementById('open-rebirth');
const REBIRTH_OVERLAY = document.getElementById('rebirth-overlay');
const CLOSE_REBIRTH = document.getElementById('close-rebirth');
const CANCEL_REBIRTH = document.getElementById('cancel-rebirth');
const CONFIRM_REBIRTH = document.getElementById('confirm-rebirth');

const REBIRTH_COUNT_EL = document.getElementById('rebirth-count');
const REBIRTH_COUNT_EL_2 = document.getElementById('rebirth-count-2');
const REBIRTH_MUL_EL = document.getElementById('rebirth-mul');
const REBIRTH_DESC = document.getElementById('rebirth-desc');
const REBIRTH_REWARD_EL = document.getElementById('rebirth-reward');

const STORAGE_KEY = 'sim_state_v2';

// Pagination
const UPGRADES_PER_PAGE = 7;
let currentPage = 1;

// Game state with defaults
let state = {
  money: 0,
  purchased: {}, // { id: count }
  rebirths: 0,
  totalClicks: 0,
  totalEarned: 0,
  badgesEarned: [] // badge ids
};

// derived stats
let baseClick = 1;
let clickMultiplier = 1;
let globalMultiplier = 1;
let cps = 0;
let critChance = 0;

// helper: save/load
function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function loadState(){
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try { state = Object.assign(state, JSON.parse(raw)); } catch(e){ /* ignore */ }
  }
}
loadState();

// costs scale function
function nextCost(base, count){
  return Math.max(1, Math.floor(base * Math.pow(1.15, count)));
}

// Upgrades definition (35 total). effect(count, accum) applies cumulative effect into accum object
const upgrades = [
  // 1-7 page 1 (basic click)
  { id:1, name:"Finger Strength", baseCost:10, desc:"+1 per level (add)", effect:(count,acc)=> acc.baseClick += 1*count },
  { id:2, name:"Steel Finger", baseCost:50, desc:"+4 per level (add)", effect:(count,acc)=> acc.baseClick += 4*count },
  { id:3, name:"Double Click", baseCost:200, desc:"x2 multiplier per level", effect:(count,acc)=> acc.clickMultiplier *= Math.pow(2, count) },
  { id:4, name:"Quick Reflexes", baseCost:350, desc:"+2 per click per level", effect:(count,acc)=> acc.baseClick += 2*count },
  { id:5, name:"Finger Gym", baseCost:900, desc:"+10 per level", effect:(count,acc)=> acc.baseClick += 10*count },
  { id:6, name:"Click Nexus", baseCost:2200, desc:"x1.5 multiplier per level", effect:(count,acc)=> acc.clickMultiplier *= Math.pow(1.5, count) },
  { id:7, name:"Precision Tap", baseCost:6000, desc:"+5% crit chance per level", effect:(count,acc)=> acc.critChance += 5*count },

  // page 2 (auto-cps)
  { id:8, name:"Auto-Clicker Mk I", baseCost:500, desc:"+1 $/s per level", effect:(count,acc)=> acc.cps += 1*count },
  { id:9, name:"Auto-Clicker Mk II", baseCost:1200, desc:"+5 $/s per level", effect:(count,acc)=> acc.cps += 5*count },
  { id:10, name:"Auto Farm", baseCost:4000, desc:"+20 $/s per level", effect:(count,acc)=> acc.cps += 20*count },
  { id:11, name:"Server Cluster", baseCost:15000, desc:"+100 $/s per level", effect:(count,acc)=> acc.cps += 100*count },
  { id:12, name:"Optimization Suite", baseCost:30000, desc:"x1.2 global per level", effect:(count,acc)=> acc.globalMultiplier *= Math.pow(1.2, count) },
  { id:13, name:"Bandwidth Boost", baseCost:80000, desc:"+500 $/s per level", effect:(count,acc)=> acc.cps += 500*count },
  { id:14, name:"Quantum Autos", baseCost:250000, desc:"+3000 $/s per level", effect:(count,acc)=> acc.cps += 3000*count },

  // page 3 (multipliers & crit)
  { id:15, name:"Multiplier +3x", baseCost:8000, desc:"x3 click multiplier per level", effect:(count,acc)=> acc.clickMultiplier *= Math.pow(3, count) },
  { id:16, name:"Critical Strikes", baseCost:50000, desc:"+5% crit chance per level (double)", effect:(count,acc)=> acc.critChance += 5*count },
  { id:17, name:"Lucky Charm", baseCost:120000, desc:"+50% critical reward (applied multiplicative)", effect:(count,acc)=> acc.critBonusMultiplier *= Math.pow(1.5, count) },
  { id:18, name:"Profit Booster", baseCost:150000, desc:"Double everything per level", effect:(count,acc)=> acc.globalMultiplier *= Math.pow(2, count) },
  { id:19, name:"Golden Click", baseCost:500000, desc:"+1000 per click per level", effect:(count,acc)=> acc.baseClick += 1000*count },
  { id:20, name:"Hidden Multiplier", baseCost:900000, desc:"x5 click multiplier per level", effect:(count,acc)=> acc.clickMultiplier *= Math.pow(5, count) },
  { id:21, name:"Tiny Fortune", baseCost:1200, desc:"+12 per click per level", effect:(count,acc)=> acc.baseClick += 12*count },

  // page 4 (special & quality)
  { id:22, name:"Ad Revenue", baseCost:2200, desc:"+8 $/s per level", effect:(count,acc)=> acc.cps += 8*count },
  { id:23, name:"Sponsor Deals", baseCost:10000, desc:"+60 $/s per level", effect:(count,acc)=> acc.cps += 60*count },
  { id:24, name:"Merch Store", baseCost:45000, desc:"+300 $/s per level", effect:(count,acc)=> acc.cps += 300*count },
  { id:25, name:"Investor", baseCost:200000, desc:"x1.25 global per level", effect:(count,acc)=> acc.globalMultiplier *= Math.pow(1.25, count) },
  { id:26, name:"Analytics Engine", baseCost:60000, desc:"x1.1 click multiplier per level", effect:(count,acc)=> acc.clickMultiplier *= Math.pow(1.1, count) },
  { id:27, name:"Server Farm", baseCost:180000, desc:"+800 $/s per level", effect:(count,acc)=> acc.cps += 800*count },
  { id:28, name:"AI Assist", baseCost:500000, desc:"x2 cps per level", effect:(count,acc)=> acc.cps *= Math.pow(2, count) },

  // page 5 (endgame / prestige helpers)
  { id:29, name:"Legacy Protocol", baseCost:800000, desc:"x1.5 global per level", effect:(count,acc)=> acc.globalMultiplier *= Math.pow(1.5, count) },
  { id:30, name:"Temporal Cache", baseCost:1200000, desc:"+5000 $/s per level", effect:(count,acc)=> acc.cps += 5000*count },
  { id:31, name:"Parallel Universe", baseCost:3000000, desc:"x3 click multiplier per level", effect:(count,acc)=> acc.clickMultiplier *= Math.pow(3, count) },
  { id:32, name:"Event Horizon", baseCost:7500000, desc:"+20000 $/s per level", effect:(count,acc)=> acc.cps += 20000*count },
  { id:33, name:"Ascension Node", baseCost:20000000, desc:"x2 global per level", effect:(count,acc)=> acc.globalMultiplier *= Math.pow(2, count) },
  { id:34, name:"Mythic Click", baseCost:50000000, desc:"+100000 per click per level", effect:(count,acc)=> acc.baseClick += 100000*count },
  { id:35, name:"Endless Engine", baseCost:150000000, desc:"+100k $/s per level", effect:(count,acc)=> acc.cps += 100000*count }
];

// badges definitions
const badges = [
  { id: 1, name: "First Click", desc: "Make your first click", condition: s => s.totalClicks >= 1 },
  { id: 2, name: "Click Novice", desc: "100 total clicks", condition: s => s.totalClicks >= 100 },
  { id: 3, name: "Click Master", desc: "10,000 total clicks", condition: s => s.totalClicks >= 10000 },
  { id: 4, name: "Small Fortune", desc: "Earn $1,000 total", condition: s => s.totalEarned >= 1000 },
  { id: 5, name: "Big Bank", desc: "Earn $1,000,000 total", condition: s => s.totalEarned >= 1000000 },
  { id: 6, name: "Collector", desc: "Buy 10 upgrades in total (levels)", condition: s => totalUpgradesBought(s) >= 10 },
  { id: 7, name: "Upgrader", desc: "Buy 100 upgrades in total (levels)", condition: s => totalUpgradesBought(s) >= 100 },
  { id: 8, name: "Prestige", desc: "Perform 1 rebirth", condition: s => s.rebirths >= 1 },
  { id: 9, name: "Veteran", desc: "Perform 5 rebirths", condition: s => s.rebirths >= 5 },
  { id:10, name: "Completionist", desc: "Buy at least 1 of every upgrade", condition: s => upgrades.every(u => (s.purchased[u.id]||0) >= 1) }
];

// helpers
function totalUpgradesBought(s){
  return Object.values(s.purchased).reduce((a,b)=>a+(b||0),0);
}

// compute derived stats from purchased counts and rebirths
function recomputeFromPurchased(){
  // reset derived accumulators
  const accum = {
    baseClick: 1,
    clickMultiplier: 1,
    globalMultiplier: 1,
    cps: 0,
    critChance: 0,
    critBonusMultiplier: 1
  };

  // apply each upgrade effect with its count
  for (const up of upgrades){
    const count = state.purchased[up.id] || 0;
    if (count > 0 && typeof up.effect === 'function'){
      up.effect(count, accum);
    }
  }

  // apply rebirth multiplier (10% per rebirth)
  const rebirthMul = 1 + (state.rebirths * 0.10);
  accum.globalMultiplier *= rebirthMul;

  // save derived to globals
  baseClick = accum.baseClick;
  clickMultiplier = accum.clickMultiplier;
  globalMultiplier = accum.globalMultiplier;
  cps = accum.cps;
  critChance = accum.critChance;
  // small safety
  if (!isFinite(baseClick)) baseClick = 1;
  if (!isFinite(clickMultiplier)) clickMultiplier = 1;
  if (!isFinite(globalMultiplier)) globalMultiplier = 1;
  if (!isFinite(cps)) cps = 0;
}

// formatting
function fmt(n){ return `$${n.toLocaleString()}`; }

// update UI
function updateMoneyUI(){
  MONEY_EL.textContent = fmt(Math.round(state.money));
  SHOP_BALANCE.textContent = fmt(Math.round(state.money));
  CPS_EL.textContent = `${Math.round(cps * globalMultiplier).toLocaleString()} /s`;
  document.getElementById('rebirth-count').textContent = state.rebirths;
  document.getElementById('rebirth-count-2').textContent = state.rebirths;
  const rebMul = (1 + state.rebirths * 0.10);
  document.getElementById('rebirth-mul').textContent = `x${rebMul.toFixed(2)}`;
  REBIRTH_MUL_EL && (REBIRTH_MUL_EL.textContent = `x${rebMul.toFixed(2)}`);
  REBIRTH_REWARD_EL && (REBIRTH_REWARD_EL.textContent = `+${(10*state.rebirths)}% total (next included)`);
}

// rendering shop page
function renderShop(page = currentPage){
  currentPage = Math.max(1, Math.min(page, Math.ceil(upgrades.length / UPGRADES_PER_PAGE)));
  UPGRADES_LIST.innerHTML = '';
  const start = (currentPage - 1) * UPGRADES_PER_PAGE;
  const pageUps = upgrades.slice(start, start + UPGRADES_PER_PAGE);
  for (const up of pageUps){
    const card = document.createElement('div');
    card.className = 'upgrade';

    const title = document.createElement('h3');
    title.textContent = `${up.name}  (x${state.purchased[up.id]||0})`;
    const desc = document.createElement('p');
    desc.textContent = up.desc;

    const row = document.createElement('div');
    row.className = 'upgrade-row';

    const next = nextCost(up.baseCost, state.purchased[up.id] || 0);
    const costDiv = document.createElement('div');
    costDiv.textContent = fmt(next);
    costDiv.style.fontWeight = '700';
    costDiv.style.color = state.money >= next ? '#e6f2ff' : 'var(--muted)';

    const buyBtn = document.createElement('button');
    buyBtn.className = 'buy-btn';
    buyBtn.textContent = `Buy`;
    buyBtn.disabled = state.money < next;
    buyBtn.addEventListener('click', ()=>{
      buyUpgrade(up.id);
    });

    row.appendChild(buyBtn);
    row.appendChild(costDiv);

    card.appendChild(title);
    card.appendChild(desc);
    card.appendChild(row);

    UPGRADES_LIST.appendChild(card);
  }

  PAGE_INDICATOR.textContent = `Page ${currentPage} / ${Math.ceil(upgrades.length / UPGRADES_PER_PAGE)}`;
  PREV_PAGE.disabled = currentPage === 1;
  NEXT_PAGE.disabled = currentPage === Math.ceil(upgrades.length / UPGRADES_PER_PAGE);
  updateMoneyUI();
  checkBadges();
}

// buy logic (buy 1 level per click). Multi-buy could be done later with shift-click.
function buyUpgrade(id){
  const up = upgrades.find(u=>u.id===id);
  if (!up) return;
  const count = state.purchased[id] || 0;
  const cost = nextCost(up.baseCost, count);
  if (state.money < cost) return;
  state.money -= cost;
  state.purchased[id] = count + 1;
  state.totalEarned = state.totalEarned; // no change (we track money and totalEarned separately)
  saveState();
  recomputeFromPurchased();
  renderShop();
  updateMoneyUI();
}

// handle click
function handleClick(){
  // compute click amount and crit
  let amount = baseClick * clickMultiplier * globalMultiplier;
  let isCrit = false;
  if (critChance > 0){
    if (Math.random()*100 < critChance){
      isCrit = true;
      amount *= 2;
    }
  }
  amount = Math.round(amount);
  addMoney(amount);
  state.totalClicks += 1;
  state.totalEarned += amount;
  saveState();
  // small feedback
  if (isCrit) flashMoney('+CRIT!');
  popAnimation(CLICKER);
  checkBadges();
}

// money add save update
function addMoney(n){
  state.money += n;
  saveState();
  updateMoneyUI();
}

// little pop
function popAnimation(el){
  if (el.animate){
    el.animate([
      { transform: 'scale(1)', boxShadow: '0 8px 30px rgba(227,27,27,0.18)' },
      { transform: 'scale(1.06)', boxShadow: '0 18px 40px rgba(227,27,27,0.28)' },
      { transform: 'scale(1)', boxShadow: '0 8px 30px rgba(227,27,27,0.18)' },
    ], { duration: 200, easing: 'cubic-bezier(.2,.9,.2,1)' });
  }
}
function flashMoney(text) {
  const el = document.createElement('div');
  el.textContent = text;
  el.style.position = 'fixed';
  el.style.left = '50%';
  el.style.top = '38%';
  el.style.transform = 'translateX(-50%)';
  el.style.background = 'rgba(255,255,255,0.06)';
  el.style.padding = '10px 16px';
  el.style.borderRadius = '10px';
  el.style.fontWeight = '800';
  el.style.color = '#fffb';
  el.style.zIndex = 60;
  document.body.appendChild(el);
  setTimeout(()=> el.style.opacity = '0', 650);
  setTimeout(()=> el.remove(), 950);
}

// CPS interval (adds cps every second)
setInterval(()=>{
  if (cps > 0){
    const gain = Math.round(cps * globalMultiplier);
    if (gain > 0) {
      state.money += gain;
      state.totalEarned += gain;
      saveState();
      updateMoneyUI();
      checkBadges();
    }
  }
}, 1000);

// badges UI & checking
function checkBadges(){
  let changed = false;
  for (const b of badges){
    const have = state.badgesEarned.includes(b.id);
    if (!have && b.condition(state)){
      state.badgesEarned.push(b.id);
      changed = true;
      // small notification
      flashMoney(`Badge unlocked: ${b.name}`);
    }
  }
  if (changed) {
    saveState();
    renderBadges();
  }
}

// render badges into badges modal
function renderBadges(){
  BADGES_LIST.innerHTML = '';
  for (const b of badges){
    const unlocked = state.badgesEarned.includes(b.id);
    const el = document.createElement('div');
    el.className = 'badge' + (unlocked ? '' : ' locked');
    el.innerHTML = `<div class="b-left">${unlocked ? '★' : '🔒'}</div>
      <div style="flex:1">
        <div style="font-weight:800">${b.name}</div>
        <div style="color:var(--muted);font-size:13px">${b.desc}</div>
      </div>`;
    BADGES_LIST.appendChild(el);
  }
}

// shop open/close
function openShop(){ SHOP_OVERLAY.classList.remove('hidden'); SHOP_OVERLAY.setAttribute('aria-hidden','false'); renderShop(currentPage); }
function closeShop(){ SHOP_OVERLAY.classList.add('hidden'); SHOP_OVERLAY.setAttribute('aria-hidden','true'); }
OPEN_SHOP.addEventListener('click', openShop);
CLOSE_SHOP.addEventListener('click', closeShop);
CLOSE_SHOP_2.addEventListener('click', closeShop);
SHOP_OVERLAY.addEventListener('click',(e)=>{ if (e.target===SHOP_OVERLAY) closeShop(); });

PREV_PAGE.addEventListener('click', ()=>{ renderShop(currentPage - 1); });
NEXT_PAGE.addEventListener('click', ()=>{ renderShop(currentPage + 1); });

// badges modal
OPEN_BADGES.addEventListener('click', ()=>{
  BADGES_OVERLAY.classList.remove('hidden');
  BADGES_OVERLAY.setAttribute('aria-hidden','false');
  renderBadges();
});
CLOSE_BADGES.addEventListener('click', ()=>{ BADGES_OVERLAY.classList.add('hidden'); BADGES_OVERLAY.setAttribute('aria-hidden','true'); });
CLOSE_BADGES_2.addEventListener('click', ()=>{ BADGES_OVERLAY.classList.add('hidden'); BADGES_OVERLAY.setAttribute('aria-hidden','true'); });
BADGES_OVERLAY.addEventListener('click',(e)=>{ if (e.target===BADGES_OVERLAY) { BADGES_OVERLAY.classList.add('hidden'); BADGES_OVERLAY.setAttribute('aria-hidden','true'); }});

// rebirth modal and logic
function rebirthThreshold(){
  // base threshold: 1,000,000 * (rebirths+1)
  return 1000000 * (state.rebirths + 1);
}
function openRebirth(){
  REBIRTH_OVERLAY.classList.remove('hidden');
  REBIRTH_OVERLAY.setAttribute('aria-hidden','false');
  REBIRTH_DESC.textContent = `Rebirthing will reset money and upgrade levels, but grant a permanent +10% bonus per rebirth (stacking). Next rebirth requires ${fmt(rebirthThreshold())}.`;
  document.getElementById('rebirth-count-2').textContent = state.rebirths;
  document.getElementById('rebirth-reward').textContent = `+${(state.rebirths+1)*10}% per rebirth (applied)`;
}
function closeRebirth(){ REBIRTH_OVERLAY.classList.add('hidden'); REBIRTH_OVERLAY.setAttribute('aria-hidden','true'); }

OPEN_REBIRTH.addEventListener('click', openRebirth);
CLOSE_REBIRTH.addEventListener('click', closeRebirth);
CANCEL_REBIRTH.addEventListener('click', closeRebirth);

CONFIRM_REBIRTH.addEventListener('click', ()=>{
  const req = rebirthThreshold();
  if (state.money < req){
    flashMoney("You don't meet the rebirth requirement");
    return;
  }
  // perform rebirth: increment rebirths, reset money and purchased counts, but keep totalEarned and totalClicks and badges and rebirth count
  state.rebirths += 1;
  state.money = 0;
  state.purchased = {};
  // keep totalEarned & totalClicks as lifetime counters
  saveState();
  recomputeFromPurchased();
  closeRebirth();
  updateMoneyUI();
  renderShop();
  flashMoney(`Rebirthed! Rebirths: ${state.rebirths}`);
});

// keyboard shortcuts
document.addEventListener('keydown', (e)=>{
  if (e.code === 'Space'){
    if (document.activeElement && ['INPUT','TEXTAREA','BUTTON'].includes(document.activeElement.tagName)) return;
    e.preventDefault();
    handleClick();
  } else if (e.key === 's' || e.key === 'S') {
    openShop();
  } else if (e.key === 'b' || e.key === 'B') {
    OPEN_BADGES.click();
  } else if (e.key === 'r' || e.key === 'R') {
    OPEN_REBIRTH.click();
  }
});

// initial compute & render
recomputeFromPurchased();
updateMoneyUI();
renderShop(1);
renderBadges();
checkBadges();

// attach click handler
CLICKER.addEventListener('click', handleClick);

// small aesthetic pulse
if (CLICKER.animate){
  CLICKER.animate([
    { transform: 'translateY(0)' },
    { transform: 'translateY(-6px)' },
    { transform: 'translateY(0)' }
  ], { duration: 900, iterations: 1, easing: 'ease-out' });
}

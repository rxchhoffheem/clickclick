// Fixed, complete script.js — includes upgrades, badges, events/challenges, and leaderboards.
// Storage version bumped to v4 to be compatible with the last change.
const STORAGE_KEY = 'sim_state_v4';

// DOM refs
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

// Admin/auth DOM
const ADMIN_BTN = document.getElementById('admin-toggle-btn');
const AUTH_OVERLAY = document.getElementById('auth-overlay');
const AUTH_INPUT = document.getElementById('auth-input');
const AUTH_SUBMIT = document.getElementById('auth-submit');
const CLOSE_AUTH = document.getElementById('close-auth');

const ADMIN_OVERLAY = document.getElementById('admin-overlay');
const ADMIN_ADD_INPUT = document.getElementById('admin-add-input');
const ADMIN_ADD_BTN = document.getElementById('admin-add-btn');
const ADMIN_SET_INPUT = document.getElementById('admin-set-input');
const ADMIN_SET_BTN = document.getElementById('admin-set-btn');
const ADMIN_LOCK_BTN = document.getElementById('admin-lock-btn');
const CLOSE_ADMIN = document.getElementById('close-admin');

// Settings & UI additions
const OPEN_SETTINGS = document.getElementById('open-settings');
const SETTINGS_OVERLAY = document.getElementById('settings-overlay');
const CLOSE_SETTINGS = document.getElementById('close-settings');
const SAVE_SETTINGS = document.getElementById('save-settings');
const CLOSE_SETTINGS_2 = document.getElementById('close-settings-2');
const TOGGLE_VIBRATE = document.getElementById('toggle-vibrate');
const TOGGLE_SOUND = document.getElementById('toggle-sound');
const OFFLINE_CAP_INPUT = document.getElementById('offline-cap');
const REMOTE_LEADERBOARD_ENDPOINT = document.getElementById('remote-leaderboard-endpoint');

// Events & Leaderboards UI
const OPEN_EVENTS = document.getElementById('open-events');
const EVENTS_OVERLAY = document.getElementById('events-overlay');
const CLOSE_EVENTS = document.getElementById('close-events');
const CLOSE_EVENTS_2 = document.getElementById('close-events-2');
const EVENTS_BODY = document.getElementById('events-body');

const OPEN_LEADERBOARD = document.getElementById('open-leaderboard');
const LEADERBOARD_OVERLAY = document.getElementById('leaderboard-overlay');
const CLOSE_LEADERBOARD = document.getElementById('close-leaderboard');
const CLOSE_LEADERBOARD_2 = document.getElementById('close-leaderboard-2');
const LEADERBOARD_LIST = document.getElementById('leaderboard-list');
const LEADER_NAME = document.getElementById('leader-name');
const SUBMIT_LOCAL_SCORE = document.getElementById('submit-local-score');

// Pagination
const UPGRADES_PER_PAGE = 7;
let currentPage = 1;

// Game state
let state = {
  version: 4,
  money: 0,
  purchased: {},
  rebirths: 0,
  totalClicks: 0,
  totalEarned: 0,
  badgesEarned: [],
  adminUnlocked: false,
  lastTick: Date.now(),
  settings: {
    vibrate: true,
    sound: false,
    offlineCapMinutes: 60,
    remoteLeaderboardEndpoint: ''
  },
  // events & leaderboard
  activeEvent: null,
  eventHistory: [],
  leaderboard: []
};

// Derived stats
let baseClick = 1, clickMultiplier = 1, globalMultiplier = 1, cps = 0, critChance = 0;

// Audio helper
let audioCtx = null;
function beep(){ if (!state.settings.sound) return; try{ if (!audioCtx) audioCtx = new (window.AudioContext||window.webkitAudioContext)(); const o = audioCtx.createOscillator(); const g = audioCtx.createGain(); o.type='sine'; o.frequency.value=880; g.gain.value=0.05; o.connect(g); g.connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + 0.06); }catch(e){} }

// --- Upgrades (full list) ---
const upgrades = [
  { id:1, name:"Finger Strength", baseCost:10, desc:"+1 per level (add)", effect:(count,acc)=> acc.baseClick += 1*count },
  { id:2, name:"Steel Finger", baseCost:50, desc:"+4 per level (add)", effect:(count,acc)=> acc.baseClick += 4*count },
  { id:3, name:"Double Click", baseCost:200, desc:"x2 multiplier per level", effect:(count,acc)=> acc.clickMultiplier *= Math.pow(2, count) },
  { id:4, name:"Quick Reflexes", baseCost:350, desc:"+2 per click per level", effect:(count,acc)=> acc.baseClick += 2*count },
  { id:5, name:"Finger Gym", baseCost:900, desc:"+10 per level", effect:(count,acc)=> acc.baseClick += 10*count },
  { id:6, name:"Click Nexus", baseCost:2200, desc:"x1.5 multiplier per level", effect:(count,acc)=> acc.clickMultiplier *= Math.pow(1.5, count) },
  { id:7, name:"Precision Tap", baseCost:6000, desc:"+5% crit chance per level", effect:(count,acc)=> acc.critChance += 5*count },

  { id:8, name:"Auto-Clicker Mk I", baseCost:500, desc:"+1 $/s per level", effect:(count,acc)=> acc.cps += 1*count },
  { id:9, name:"Auto-Clicker Mk II", baseCost:1200, desc:"+5 $/s per level", effect:(count,acc)=> acc.cps += 5*count },
  { id:10, name:"Auto Farm", baseCost:4000, desc:"+20 $/s per level", effect:(count,acc)=> acc.cps += 20*count },
  { id:11, name:"Server Cluster", baseCost:15000, desc:"+100 $/s per level", effect:(count,acc)=> acc.cps += 100*count },
  { id:12, name:"Optimization Suite", baseCost:30000, desc:"x1.2 global per level", effect:(count,acc)=> acc.globalMultiplier *= Math.pow(1.2, count) },
  { id:13, name:"Bandwidth Boost", baseCost:80000, desc:"+500 $/s per level", effect:(count,acc)=> acc.cps += 500*count },
  { id:14, name:"Quantum Autos", baseCost:250000, desc:"+3000 $/s per level", effect:(count,acc)=> acc.cps += 3000*count },

  { id:15, name:"Multiplier +3x", baseCost:8000, desc:"x3 click multiplier per level", effect:(count,acc)=> acc.clickMultiplier *= Math.pow(3, count) },
  { id:16, name:"Critical Strikes", baseCost:50000, desc:"+5% crit chance per level (double)", effect:(count,acc)=> acc.critChance += 5*count },
  { id:17, name:"Lucky Charm", baseCost:120000, desc:"+50% critical reward (applied multiplicative)", effect:(count,acc)=> acc.critBonusMultiplier *= Math.pow(1.5, count) },
  { id:18, name:"Profit Booster", baseCost:150000, desc:"Double everything per level", effect:(count,acc)=> acc.globalMultiplier *= Math.pow(2, count) },
  { id:19, name:"Golden Click", baseCost:500000, desc:"+1000 per click per level", effect:(count,acc)=> acc.baseClick += 1000*count },
  { id:20, name:"Hidden Multiplier", baseCost:900000, desc:"x5 click multiplier per level", effect:(count,acc)=> acc.clickMultiplier *= Math.pow(5, count) },
  { id:21, name:"Tiny Fortune", baseCost:1200, desc:"+12 per click per level", effect:(count,acc)=> acc.baseClick += 12*count },

  { id:22, name:"Ad Revenue", baseCost:2200, desc:"+8 $/s per level", effect:(count,acc)=> acc.cps += 8*count },
  { id:23, name:"Sponsor Deals", baseCost:10000, desc:"+60 $/s per level", effect:(count,acc)=> acc.cps += 60*count },
  { id:24, name:"Merch Store", baseCost:45000, desc:"+300 $/s per level", effect:(count,acc)=> acc.cps += 300*count },
  { id:25, name:"Investor", baseCost:200000, desc:"x1.25 global per level", effect:(count,acc)=> acc.globalMultiplier *= Math.pow(1.25, count) },
  { id:26, name:"Analytics Engine", baseCost:60000, desc:"x1.1 click multiplier per level", effect:(count,acc)=> acc.clickMultiplier *= Math.pow(1.1, count) },
  { id:27, name:"Server Farm", baseCost:180000, desc:"+800 $/s per level", effect:(count,acc)=> acc.cps += 800*count },
  { id:28, name:"AI Assist", baseCost:500000, desc:"x2 cps per level", effect:(count,acc)=> acc.cps *= Math.pow(2, count) },

  { id:29, name:"Legacy Protocol", baseCost:800000, desc:"x1.5 global per level", effect:(count,acc)=> acc.globalMultiplier *= Math.pow(1.5, count) },
  { id:30, name:"Temporal Cache", baseCost:1200000, desc:"+5000 $/s per level", effect:(count,acc)=> acc.cps += 5000*count },
  { id:31, name:"Parallel Universe", baseCost:3000000, desc:"x3 click multiplier per level", effect:(count,acc)=> acc.clickMultiplier *= Math.pow(3, count) },
  { id:32, name:"Event Horizon", baseCost:7500000, desc:"+20000 $/s per level", effect:(count,acc)=> acc.cps += 20000*count },
  { id:33, name:"Ascension Node", baseCost:20000000, desc:"x2 global per level", effect:(count,acc)=> acc.globalMultiplier *= Math.pow(2, count) },
  { id:34, name:"Mythic Click", baseCost:50000000, desc:"+100000 per click per level", effect:(count,acc)=> acc.baseClick += 100000*count },
  { id:35, name:"Endless Engine", baseCost:150000000, desc:"+100k $/s per level", effect:(count,acc)=> acc.cps += 100000*count }
];

// --- Badges ---
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
function totalUpgradesBought(s){ return Object.values(s.purchased).reduce((a,b)=>a+(b||0),0); }

// recompute derived values
function recomputeFromPurchased(){
  const accum = { baseClick:1, clickMultiplier:1, globalMultiplier:1, cps:0, critChance:0, critBonusMultiplier:1 };
  for (const up of upgrades){
    const count = state.purchased[up.id] || 0;
    if (count > 0 && typeof up.effect === 'function') up.effect(count, accum);
  }
  const rebirthMul = 1 + (state.rebirths * 0.10);
  accum.globalMultiplier *= rebirthMul;
  baseClick = isFinite(accum.baseClick) ? accum.baseClick : 1;
  clickMultiplier = isFinite(accum.clickMultiplier) ? accum.clickMultiplier : 1;
  globalMultiplier = isFinite(accum.globalMultiplier) ? accum.globalMultiplier : 1;
  cps = isFinite(accum.cps) ? accum.cps : 0;
  critChance = isFinite(accum.critChance) ? accum.critChance : 0;
}

// formatting
function fmtLarge(n){
  if (n < 1000) return String(n);
  const units = ['K','M','B','T','Q'];
  let u = -1; let v = n;
  while (v >= 1000 && u < units.length - 1){ v /= 1000; u++; }
  return v.toFixed(v < 10 ? 2 : 1) + units[u];
}
function fmt(n){ return `$${fmtLarge(Math.round(n))}`; }

// UI updates
let lastUI = 0;
function updateMoneyUI(force = false){
  const now = performance.now();
  if (!force && now - lastUI < 120) return;
  lastUI = now;
  MONEY_EL.textContent = fmt(state.money);
  SHOP_BALANCE.textContent = fmt(state.money);
  CPS_EL.textContent = `${fmtLarge(Math.round(cps * globalMultiplier))} /s`;
  REBIRTH_COUNT_EL && (REBIRTH_COUNT_EL.textContent = state.rebirths);
  REBIRTH_COUNT_EL_2 && (REBIRTH_COUNT_EL_2.textContent = state.rebirths);
  const rebMul = (1 + state.rebirths * 0.10);
  REBIRTH_MUL_EL && (REBIRTH_MUL_EL.textContent = `x${rebMul.toFixed(2)}`);
  REBIRTH_REWARD_EL && (REBIRTH_REWARD_EL.textContent = `+${(10*state.rebirths)}% total (next included)`);
}

// small animations
function popAnimation(el){ if (el && el.animate) el.animate([{ transform:'scale(1)' },{ transform:'scale(1.06)' },{ transform:'scale(1)' }], { duration:160, easing:'cubic-bezier(.2,.9,.2,1)' }); }
function flashMoney(text){ const el = document.createElement('div'); el.className = 'flash-money'; el.textContent = text; document.body.appendChild(el); requestAnimationFrame(()=> el.style.opacity = '1'); setTimeout(()=> el.style.opacity = '0', 700); setTimeout(()=> el.remove(), 1200); }

// persistence + migration
function saveState(){ state.lastTick = Date.now(); localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function loadState(){ const raw = localStorage.getItem(STORAGE_KEY); if (raw){ try { const parsed = JSON.parse(raw); migrate(parsed); } catch(e){ console.warn('failed load', e); } } }
function migrate(parsed){ if (!parsed) return; state = Object.assign({}, state, parsed); if (!state.settings) state.settings = { vibrate:true, sound:false, offlineCapMinutes:60, remoteLeaderboardEndpoint:'' }; if (!state.lastTick) state.lastTick = Date.now(); if (!Array.isArray(state.leaderboard)) state.leaderboard = []; state.version = 4; }

// offline accrual
function applyOfflineEarnings(){
  recomputeFromPurchased();
  const now = Date.now();
  const elapsedMs = Math.max(0, now - (state.lastTick || now));
  const elapsedSec = Math.floor(elapsedMs / 1000);
  const cap = Math.max(0, (state.settings.offlineCapMinutes||60) * 60);
  const dt = Math.min(elapsedSec, cap);
  if (dt > 0 && cps > 0){
    const gain = Math.floor(cps * globalMultiplier * dt);
    if (gain > 0){
      state.money += gain;
      state.totalEarned += gain;
      flashMoney(`+${fmtLarge(gain)} (offline)`);
    }
  }
}

// cost helpers
function nextCost(base, count){ return Math.max(1, Math.floor(base * Math.pow(1.15, count))); }
function maxAffordable(base, count, money){
  const r = 1.15;
  const first = base * Math.pow(r, count);
  if (money < first) return 0;
  const cap = 1 + money * (r - 1) / first;
  const n = Math.floor(Math.log(cap) / Math.log(r));
  return Math.max(0, n);
}

// --- Events / Challenges ---
const EVENT_TEMPLATES = [
  { idPrefix: 'click', name: 'Click Frenzy', desc: 'Make many clicks in time', goalType: 'totalClicks', targetBase: 200, reward: { money: 500 } },
  { idPrefix: 'earn', name: 'Earnings Sprint', desc: 'Earn a lot of money', goalType: 'totalEarned', targetBase: 1000, reward: { money: 1500 } },
  { idPrefix: 'buy', name: 'Upgrade Spree', desc: 'Buy upgrades quickly', goalType: 'buyCount', targetBase: 10, reward: { money: 800 } },
  { idPrefix: 'cps', name: 'Autoclick Boost', desc: 'Accumulate CPS income', goalType: 'accumulateCPS', targetBase: 500, reward: { money: 1200 } }
];

function generateEvent(seedIdx = null){
  const idx = (seedIdx === null) ? Math.floor(Math.random() * EVENT_TEMPLATES.length) : seedIdx % EVENT_TEMPLATES.length;
  const tpl = EVENT_TEMPLATES[idx];
  const scale = Math.max(1, 1 + state.rebirths * 0.1);
  const target = Math.max(1, Math.round(tpl.targetBase * scale * (0.8 + Math.random() * 0.8)));
  const durationSec = 60 * (6 + Math.floor(Math.random() * 6)); // 6-11 minutes
  const now = Date.now();
  return {
    id: `${tpl.idPrefix}_${Date.now()}`,
    name: tpl.name,
    desc: tpl.desc,
    goalType: tpl.goalType,
    target,
    progress: 0,
    expiresAt: now + durationSec * 1000,
    reward: tpl.reward,
    completed: false,
    claimed: false,
    startedAt: now
  };
}

function ensureActiveEvent(){
  if (!state.activeEvent || state.activeEvent.expiresAt <= Date.now()){
    state.activeEvent = generateEvent();
    saveState();
  }
}

function updateEventProgress(delta){
  if (!state.activeEvent || state.activeEvent.completed) return;
  const g = state.activeEvent.goalType;
  // delta is numeric amount; for some goalTypes delta represents different things (we call with appropriate value)
  state.activeEvent.progress = Math.min(state.activeEvent.target, state.activeEvent.progress + delta);
  if (state.activeEvent.progress >= state.activeEvent.target){
    state.activeEvent.completed = true;
    flashMoney(`Event complete: ${state.activeEvent.name}`);
  }
  saveState();
  renderEvents();
}

function claimEvent(){
  if (!state.activeEvent) return;
  if (!state.activeEvent.completed) { flashMoney('Event not complete'); return; }
  if (state.activeEvent.claimed) { flashMoney('Already claimed'); return; }
  if (state.activeEvent.reward && state.activeEvent.reward.money){
    state.money += state.activeEvent.reward.money;
    state.totalEarned += state.activeEvent.reward.money;
  }
  state.activeEvent.claimed = true;
  state.eventHistory = state.eventHistory.slice(-20).concat([state.activeEvent]);
  saveState();
  renderEvents();
  updateMoneyUI(true);
  flashMoney(`Reward: ${fmt(state.activeEvent.reward.money)}`);
}

function renderEvents(){
  if (!EVENTS_BODY) return;
  EVENTS_BODY.innerHTML = '';
  if (!state.activeEvent) { EVENTS_BODY.textContent = 'No active event.'; return; }
  const ev = state.activeEvent;
  const now = Date.now();
  const remaining = Math.max(0, Math.floor((ev.expiresAt - now) / 1000));
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const wrapper = document.createElement('div');

  const title = document.createElement('div');
  title.style.display = 'flex';
  title.style.justifyContent = 'space-between';
  title.innerHTML = `<div style="font-weight:800">${ev.name}</div><div style="color:var(--muted)">${minutes}m ${seconds}s</div>`;
  wrapper.appendChild(title);

  const desc = document.createElement('div');
  desc.style.color = 'var(--muted)';
  desc.style.marginTop = '6px';
  desc.textContent = `${ev.desc} — Goal: ${fmtLarge(ev.target)} (${ev.goalType})`;
  wrapper.appendChild(desc);

  const progWrap = document.createElement('div');
  progWrap.className = 'progress';
  const bar = document.createElement('div');
  bar.className = 'bar';
  const pct = Math.min(100, Math.round((ev.progress / ev.target) * 100));
  bar.style.width = pct + '%';
  progWrap.appendChild(bar);
  wrapper.appendChild(progWrap);

  const ptext = document.createElement('div');
  ptext.style.marginTop = '8px';
  ptext.style.display = 'flex';
  ptext.style.justifyContent = 'space-between';
  ptext.innerHTML = `<div>${fmtLarge(ev.progress)} / ${fmtLarge(ev.target)}</div><div style="font-weight:700">${ev.completed ? 'Complete' : 'In progress'}</div>`;
  wrapper.appendChild(ptext);

  const actions = document.createElement('div');
  actions.style.display = 'flex';
  actions.style.justifyContent = 'flex-end';
  actions.style.gap = '8px';
  actions.style.marginTop = '10px';
  const claimBtn = document.createElement('button');
  claimBtn.className = 'buy-btn';
  claimBtn.textContent = ev.completed && !ev.claimed ? 'Claim Reward' : ev.claimed ? 'Claimed' : 'Not finished';
  claimBtn.disabled = !(ev.completed && !ev.claimed);
  claimBtn.addEventListener('click', claimEvent);
  actions.appendChild(claimBtn);
  wrapper.appendChild(actions);

  EVENTS_BODY.appendChild(wrapper);
}

// --- Leaderboards ---
function submitLocalScore(){
  const name = (LEADER_NAME && LEADER_NAME.value && LEADER_NAME.value.trim()) || `Player`;
  const score = state.totalEarned || Math.round(state.money);
  const entry = { name, score, when: Date.now() };
  state.leaderboard = state.leaderboard || [];
  state.leaderboard.push(entry);
  state.leaderboard.sort((a,b)=> b.score - a.score || a.when - b.when);
  state.leaderboard = state.leaderboard.slice(0, 10);
  saveState();
  renderLeaderboards();
  flashMoney('Score submitted locally');
  const endpoint = (state.settings && state.settings.remoteLeaderboardEndpoint) || '';
  if (endpoint && endpoint.trim()){
    submitRemoteScore(entry, endpoint).then(()=> flashMoney('Remote submit OK')).catch(()=> flashMoney('Remote submit failed'));
  }
}

async function submitRemoteScore(entry, endpoint){
  try {
    const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entry) });
    if (!res.ok) throw new Error('not ok');
    return true;
  } catch(e){
    console.warn('remote submit failed', e);
    throw e;
  }
}

function renderLeaderboards(){
  if (!LEADERBOARD_LIST) return;
  LEADERBOARD_LIST.innerHTML = '';
  const list = state.leaderboard && state.leaderboard.length ? state.leaderboard : [];
  if (list.length === 0){
    LEADERBOARD_LIST.innerHTML = '<div style="color:var(--muted)">No scores yet — submit yours!</div>';
    return;
  }
  list.forEach((e, idx)=>{
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.justifyContent = 'space-between';
    row.style.alignItems = 'center';
    row.style.padding = '8px';
    row.style.borderRadius = '8px';
    row.style.background = 'linear-gradient(180deg, rgba(255,255,255,0.01), rgba(255,255,255,0.005))';
    row.innerHTML = `<div style="font-weight:800">${idx+1}. ${escapeHtml(e.name)}</div><div style="color:var(--muted)">${fmt(e.score)}</div>`;
    LEADERBOARD_LIST.appendChild(row);
  });
}
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

// --- Core gameplay (buy, render, click, cps) ---
// buy logic supporting multi-buy
function buyUpgrade(id, qty = 1){
  const up = upgrades.find(u=>u.id===id);
  if (!up) return;
  const count = state.purchased[id] || 0;
  if (qty === 'max') qty = maxAffordable(up.baseCost, count, state.money);
  if (qty <= 0) return;
  const r = 1.15;
  const start = up.baseCost * Math.pow(r, count);
  const totalCost = Math.floor(start * (Math.pow(r, qty) - 1) / (r - 1));
  if (state.money < totalCost) return;
  state.money -= totalCost;
  state.purchased[id] = count + qty;
  // update event progress if relevant
  updateEventProgress(qty);
  saveState();
  recomputeFromPurchased();
  renderShop(currentPage);
  updateMoneyUI(true);
}

// render shop
function renderShop(page = currentPage){
  currentPage = Math.max(1, Math.min(page, Math.ceil(upgrades.length / UPGRADES_PER_PAGE)));
  UPGRADES_LIST.innerHTML = '';
  const start = (currentPage - 1) * UPGRADES_PER_PAGE;
  const pageUps = upgrades.slice(start, start + UPGRADES_PER_PAGE);
  for (const up of pageUps){
    const card = document.createElement('div'); card.className = 'upgrade';
    const title = document.createElement('h3'); title.textContent = `${up.name}  (x${state.purchased[up.id]||0})`;
    const desc = document.createElement('p'); desc.textContent = up.desc;
    const row = document.createElement('div'); row.className = 'upgrade-row';
    const next = nextCost(up.baseCost, state.purchased[up.id] || 0);
    const costDiv = document.createElement('div'); costDiv.textContent = fmt(next); costDiv.style.fontWeight = '700'; costDiv.style.color = state.money >= next ? '#e6f2ff' : 'var(--muted)';
    const buyBtn = document.createElement('button'); buyBtn.className = 'buy-btn'; buyBtn.textContent = `Buy`; buyBtn.disabled = state.money < next; buyBtn.setAttribute('aria-label', `Buy ${up.name}`);
    buyBtn.addEventListener('click', (ev)=>{ if (ev.shiftKey) buyUpgrade(up.id, 'max'); else buyUpgrade(up.id, 1); });
    let pressTimer = null;
    buyBtn.addEventListener('pointerdown', ()=>{ pressTimer = setTimeout(()=> buyUpgrade(up.id, 'max'), 650); });
    buyBtn.addEventListener('pointerup', ()=>{ if (pressTimer) clearTimeout(pressTimer); });
    buyBtn.addEventListener('pointercancel', ()=>{ if (pressTimer) clearTimeout(pressTimer); });
    row.appendChild(buyBtn); row.appendChild(costDiv);
    card.appendChild(title); card.appendChild(desc); card.appendChild(row);
    UPGRADES_LIST.appendChild(card);
  }
  PAGE_INDICATOR.textContent = `Page ${currentPage} / ${Math.ceil(upgrades.length / UPGRADES_PER_PAGE)}`;
  PREV_PAGE.disabled = currentPage === 1;
  NEXT_PAGE.disabled = currentPage === Math.ceil(upgrades.length / UPGRADES_PER_PAGE);
  updateMoneyUI(true);
  checkBadges();
}

// handle click
function handleClick(){
  recomputeFromPurchased();
  let amount = Math.round(baseClick * clickMultiplier * globalMultiplier);
  let isCrit = false;
  if (critChance > 0 && Math.random() * 100 < critChance){ isCrit = true; amount *= 2; }
  state.money += amount;
  state.totalEarned += amount;
  state.totalClicks += 1;
  // update events for clicks and earnings
  updateEventProgress(1); // clicks
  updateEventProgress(amount); // earnings for earn-type events
  saveState();
  if (state.settings.vibrate && navigator.vibrate) navigator.vibrate(8);
  beep();
  if (isCrit) flashMoney('+CRIT!');
  popAnimation(CLICKER);
  updateMoneyUI(true);
  checkBadges();
}

// CPS ticker via rAF
let lastTick = performance.now();
function tick(now){
  const dt = (now - lastTick) / 1000;
  if (dt >= 0.25){
    recomputeFromPurchased();
    const gain = Math.floor(cps * globalMultiplier * dt);
    if (gain > 0){
      state.money += gain; state.totalEarned += gain;
      updateEventProgress(gain);
      saveState();
      updateMoneyUI(true);
      checkBadges();
    }
    lastTick = now;
  }
  window.requestAnimationFrame(tick);
}

// badges
function checkBadges(){
  let changed = false;
  for (const b of badges){
    const have = state.badgesEarned.includes(b.id);
    if (!have && b.condition(state)){
      state.badgesEarned.push(b.id);
      changed = true;
      flashMoney(`Badge unlocked: ${b.name}`);
    }
  }
  if (changed){ saveState(); renderBadges(); }
}
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

// shop open/close wiring
function openShop(){ SHOP_OVERLAY.classList.remove('hidden'); SHOP_OVERLAY.setAttribute('aria-hidden','false'); renderShop(currentPage); }
function closeShop(){ SHOP_OVERLAY.classList.add('hidden'); SHOP_OVERLAY.setAttribute('aria-hidden','true'); }
OPEN_SHOP && OPEN_SHOP.addEventListener('click', openShop);
CLOSE_SHOP && CLOSE_SHOP.addEventListener('click', closeShop);
CLOSE_SHOP_2 && CLOSE_SHOP_2.addEventListener('click', closeShop);
SHOP_OVERLAY && SHOP_OVERLAY.addEventListener('click',(e)=>{ if (e.target === SHOP_OVERLAY) closeShop(); });
PREV_PAGE && PREV_PAGE.addEventListener('click', ()=>{ renderShop(currentPage - 1); });
NEXT_PAGE && NEXT_PAGE.addEventListener('click', ()=>{ renderShop(currentPage + 1); });

// badges modal wiring
OPEN_BADGES && OPEN_BADGES.addEventListener('click', ()=>{ BADGES_OVERLAY.classList.remove('hidden'); BADGES_OVERLAY.setAttribute('aria-hidden','false'); renderBadges(); });
CLOSE_BADGES && CLOSE_BADGES.addEventListener('click', ()=>{ BADGES_OVERLAY.classList.add('hidden'); BADGES_OVERLAY.setAttribute('aria-hidden','true'); });
CLOSE_BADGES_2 && CLOSE_BADGES_2.addEventListener('click', ()=>{ BADGES_OVERLAY.classList.add('hidden'); BADGES_OVERLAY.setAttribute('aria-hidden','true'); });
BADGES_OVERLAY && BADGES_OVERLAY.addEventListener('click',(e)=>{ if (e.target===BADGES_OVERLAY) { BADGES_OVERLAY.classList.add('hidden'); BADGES_OVERLAY.setAttribute('aria-hidden','true'); }});

// rebirth wiring
function rebirthThreshold(){ return 1000000 * (state.rebirths + 1); }
function openRebirth(){
  REBIRTH_OVERLAY.classList.remove('hidden'); REBIRTH_OVERLAY.setAttribute('aria-hidden','false');
  REBIRTH_DESC.textContent = `Rebirthing will reset money and upgrade levels, but grant a permanent +10% bonus per rebirth (stacking). Next rebirth requires ${fmt(rebirthThreshold())}.`;
  REBIRTH_COUNT_EL_2.textContent = state.rebirths;
  REBIRTH_REWARD_EL.textContent = `+${(state.rebirths+1)*10}% per rebirth (applied)`;
}
function closeRebirth(){ REBIRTH_OVERLAY.classList.add('hidden'); REBIRTH_OVERLAY.setAttribute('aria-hidden','true'); }
OPEN_REBIRTH && OPEN_REBIRTH.addEventListener('click', openRebirth);
CLOSE_REBIRTH && CLOSE_REBIRTH.addEventListener('click', closeRebirth);
CANCEL_REBIRTH && CANCEL_REBIRTH.addEventListener('click', closeRebirth);
CONFIRM_REBIRTH && CONFIRM_REBIRTH.addEventListener('click', ()=>{
  const req = rebirthThreshold();
  if (state.money < req){ flashMoney("You don't meet the rebirth requirement"); return; }
  state.rebirths += 1; state.money = 0; state.purchased = {};
  saveState(); recomputeFromPurchased(); closeRebirth(); updateMoneyUI(true); renderShop();
  flashMoney(`Rebirthed! Rebirths: ${state.rebirths}`);
});

// keyboard shortcuts
document.addEventListener('keydown', (e)=>{
  if (e.code === 'Space'){ if (document.activeElement && ['INPUT','TEXTAREA','BUTTON'].includes(document.activeElement.tagName)) return; e.preventDefault(); handleClick(); }
  else if (e.key === 's' || e.key === 'S') OPEN_SHOP && OPEN_SHOP.click();
  else if (e.key === 'b' || e.key === 'B') OPEN_BADGES && OPEN_BADGES.click();
  else if (e.key === 'r' || e.key === 'R') OPEN_REBIRTH && OPEN_REBIRTH.click();
});

// admin wiring
function openAuth(){ AUTH_OVERLAY.classList.remove('hidden'); AUTH_OVERLAY.setAttribute('aria-hidden','false'); AUTH_INPUT.value=''; AUTH_INPUT.focus(); }
function closeAuth(){ AUTH_OVERLAY.classList.add('hidden'); AUTH_OVERLAY.setAttribute('aria-hidden','true'); }
function openAdmin(){ ADMIN_OVERLAY.classList.remove('hidden'); ADMIN_OVERLAY.setAttribute('aria-hidden','false'); ADMIN_ADD_INPUT.value=''; ADMIN_SET_INPUT.value=''; }
function closeAdmin(){ ADMIN_OVERLAY.classList.add('hidden'); ADMIN_OVERLAY.setAttribute('aria-hidden','true'); }

AUTH_SUBMIT && AUTH_SUBMIT.addEventListener('click', ()=>{
  const code = (AUTH_INPUT.value || '').trim();
  if (code.toUpperCase() === 'HEEM'){ state.adminUnlocked = true; saveState(); closeAuth(); flashMoney('Admin unlocked'); openAdmin(); }
  else { flashMoney('Invalid code'); AUTH_INPUT.value=''; AUTH_INPUT.focus(); }
});
AUTH_INPUT && AUTH_INPUT.addEventListener('keydown', (e)=>{ if (e.key === 'Enter') AUTH_SUBMIT.click(); });
CLOSE_AUTH && CLOSE_AUTH.addEventListener('click', closeAuth);
ADMIN_BTN && ADMIN_BTN.addEventListener('click', ()=>{ if (state.adminUnlocked) openAdmin(); else openAuth(); });

ADMIN_ADD_BTN && ADMIN_ADD_BTN.addEventListener('click', ()=>{
  const val = Number(ADMIN_ADD_INPUT.value); if (!isFinite(val) || val === 0){ flashMoney('Enter a valid number'); return; }
  const amount = Math.floor(val); state.money += amount; state.totalEarned += Math.max(0, amount); saveState(); updateMoneyUI(true); flashMoney(`${fmt(amount)} added`); ADMIN_ADD_INPUT.value = '';
});
ADMIN_SET_BTN && ADMIN_SET_BTN.addEventListener('click', ()=>{
  const val = Number(ADMIN_SET_INPUT.value); if (!isFinite(val) || val < 0){ flashMoney('Enter a valid non-negative number'); return; }
  state.money = Math.floor(val); saveState(); updateMoneyUI(true); flashMoney(`Money set to ${fmt(state.money)}`);
});
ADMIN_LOCK_BTN && ADMIN_LOCK_BTN.addEventListener('click', ()=>{ state.adminUnlocked = false; saveState(); closeAdmin(); flashMoney('Admin locked (code forgotten)'); });
CLOSE_ADMIN && CLOSE_ADMIN.addEventListener('click', closeAdmin);
ADMIN_OVERLAY && ADMIN_OVERLAY.addEventListener('click',(e)=>{ if (e.target === ADMIN_OVERLAY) closeAdmin(); });
AUTH_OVERLAY && AUTH_OVERLAY.addEventListener('click',(e)=>{ if (e.target === AUTH_OVERLAY) closeAuth(); });

// settings wiring
if (OPEN_SETTINGS && SETTINGS_OVERLAY){
  OPEN_SETTINGS.addEventListener('click', ()=>{
    SETTINGS_OVERLAY.classList.remove('hidden'); SETTINGS_OVERLAY.setAttribute('aria-hidden','false');
    TOGGLE_VIBRATE && (TOGGLE_VIBRATE.checked = !!state.settings.vibrate);
    TOGGLE_SOUND && (TOGGLE_SOUND.checked = !!state.settings.sound);
    OFFLINE_CAP_INPUT && (OFFLINE_CAP_INPUT.value = state.settings.offlineCapMinutes || 60);
    REMOTE_LEADERBOARD_ENDPOINT && (REMOTE_LEADERBOARD_ENDPOINT.value = state.settings.remoteLeaderboardEndpoint || '');
  });
  function closeSettings(){ SETTINGS_OVERLAY.classList.add('hidden'); SETTINGS_OVERLAY.setAttribute('aria-hidden','true'); }
  CLOSE_SETTINGS && CLOSE_SETTINGS.addEventListener('click', closeSettings);
  CLOSE_SETTINGS_2 && CLOSE_SETTINGS_2.addEventListener('click', closeSettings);
  SAVE_SETTINGS && SAVE_SETTINGS.addEventListener('click', ()=>{
    state.settings.vibrate = !!(TOGGLE_VIBRATE && TOGGLE_VIBRATE.checked);
    state.settings.sound = !!(TOGGLE_SOUND && TOGGLE_SOUND.checked);
    state.settings.offlineCapMinutes = Math.max(0, Number(OFFLINE_CAP_INPUT && OFFLINE_CAP_INPUT.value) || 0);
    state.settings.remoteLeaderboardEndpoint = (REMOTE_LEADERBOARD_ENDPOINT && REMOTE_LEADERBOARD_ENDPOINT.value) || '';
    saveState(); flashMoney('Settings saved'); closeSettings();
  });
}

// events modal wiring
if (OPEN_EVENTS && EVENTS_OVERLAY){
  OPEN_EVENTS.addEventListener('click', ()=>{ ensureActiveEvent(); renderEvents(); EVENTS_OVERLAY.classList.remove('hidden'); EVENTS_OVERLAY.setAttribute('aria-hidden','false'); });
  CLOSE_EVENTS && CLOSE_EVENTS.addEventListener('click', ()=>{ EVENTS_OVERLAY.classList.add('hidden'); EVENTS_OVERLAY.setAttribute('aria-hidden','true'); });
  CLOSE_EVENTS_2 && CLOSE_EVENTS_2.addEventListener('click', ()=>{ EVENTS_OVERLAY.classList.add('hidden'); EVENTS_OVERLAY.setAttribute('aria-hidden','true'); });
  EVENTS_OVERLAY && EVENTS_OVERLAY.addEventListener('click', (e)=>{ if (e.target === EVENTS_OVERLAY) { EVENTS_OVERLAY.classList.add('hidden'); EVENTS_OVERLAY.setAttribute('aria-hidden','true'); }});
}

// leaderboard wiring
if (OPEN_LEADERBOARD && LEADERBOARD_OVERLAY){
  OPEN_LEADERBOARD.addEventListener('click', ()=>{ renderLeaderboards(); LEADERBOARD_OVERLAY.classList.remove('hidden'); LEADERBOARD_OVERLAY.setAttribute('aria-hidden','false'); });
  CLOSE_LEADERBOARD && CLOSE_LEADERBOARD.addEventListener('click', ()=>{ LEADERBOARD_OVERLAY.classList.add('hidden'); LEADERBOARD_OVERLAY.setAttribute('aria-hidden','true'); });
  CLOSE_LEADERBOARD_2 && CLOSE_LEADERBOARD_2.addEventListener('click', ()=>{ LEADERBOARD_OVERLAY.classList.add('hidden'); LEADERBOARD_OVERLAY.setAttribute('aria-hidden','true'); });
  LEADERBOARD_OVERLAY && LEADERBOARD_OVERLAY.addEventListener('click', (e)=>{ if (e.target === LEADERBOARD_OVERLAY) { LEADERBOARD_OVERLAY.classList.add('hidden'); LEADERBOARD_OVERLAY.setAttribute('aria-hidden','true'); }});
  SUBMIT_LOCAL_SCORE && SUBMIT_LOCAL_SCORE.addEventListener('click', submitLocalScore);
}

// initialization
loadState();
applyOfflineEarnings();
ensureActiveEvent();
recomputeFromPurchased();
updateMoneyUI(true);
renderShop(1);
renderBadges();
renderEvents();
renderLeaderboards();
checkBadges();
CLICKER && CLICKER.addEventListener('click', handleClick);

// initial pulse
if (CLICKER && CLICKER.animate){
  CLICKER.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-6px)' }, { transform: 'translateY(0)' }], { duration: 900, iterations: 1, easing: 'ease-out' });
}

// start rAF ticker
window.requestAnimationFrame(tick);

// keep admin if unlocked
if (state.adminUnlocked) console.log('Admin unlocked (persisted)');

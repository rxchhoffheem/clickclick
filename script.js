const moneyEl = document.getElementById('money');
const clicker = document.getElementById('clicker');
const cpsEl = document.getElementById('cps');

const openShopBtn = document.getElementById('open-shop');
const shopOverlay = document.getElementById('shop-overlay');
const closeShopBtn = document.getElementById('close-shop');
const closeShopBtn2 = document.getElementById('close-shop-2');
const upgradesListEl = document.getElementById('upgrades-list');
const shopBalanceEl = document.getElementById('shop-balance');

const STORAGE_KEYS = {
  money: 'sim_money',
  purchased: 'sim_upgrades_purchased'
};

// base stats
let baseClick = 1;
let purchased = JSON.parse(localStorage.getItem(STORAGE_KEYS.purchased) || '[]');
let money = parseInt(localStorage.getItem(STORAGE_KEYS.money) || '0', 10) || 0;

// dynamic stats to be computed from upgrades
let clickMultiplier = 1;
let globalMultiplier = 1;
let cps = 0; // coins per second
let critChance = 0; // percent (0-100)

// define 10 upgrades
const upgrades = [
  { id: 1, name: "Finger Strength", desc: "+1 per click", cost: 10, effect: () => { baseClick += 1; } },
  { id: 2, name: "Steel Finger", desc: "+4 per click", cost: 50, effect: () => { baseClick += 4; } },
  { id: 3, name: "Double Click", desc: "x2 click multiplier", cost: 200, effect: () => { clickMultiplier *= 2; } },
  { id: 4, name: "Auto-Clicker Mk I", desc: "+1 $/s (CPS)", cost: 500, effect: () => { cps += 1; } },
  { id: 5, name: "Auto-Clicker Mk II", desc: "+5 $/s (CPS)", cost: 1200, effect: () => { cps += 5; } },
  { id: 6, name: "Click Power II", desc: "+10 per click", cost: 3000, effect: () => { baseClick += 10; } },
  { id: 7, name: "Multiplier +3x", desc: "x3 click multiplier", cost: 8000, effect: () => { clickMultiplier *= 3; } },
  { id: 8, name: "Mega Auto", desc: "+50 $/s (CPS)", cost: 20000, effect: () => { cps += 50; } },
  { id: 9, name: "Critical Strikes", desc: "5% chance to double a click reward", cost: 50000, effect: () => { critChance += 5; } },
  { id: 10, name: "Profit Booster", desc: "Double everything (global x2)", cost: 150000, effect: () => { globalMultiplier *= 2; } }
];

// compute initial derived stats from purchased upgrades
function recomputeFromPurchased() {
  // reset to base and recompute
  baseClick = 1;
  clickMultiplier = 1;
  globalMultiplier = 1;
  cps = 0;
  critChance = 0;

  for (const id of purchased) {
    const up = upgrades.find(u => u.id === id);
    if (up && typeof up.effect === 'function') up.effect();
  }
}

// UI rendering for shop
function renderShop() {
  upgradesListEl.innerHTML = '';
  for (const up of upgrades) {
    const isBought = purchased.includes(up.id);
    const card = document.createElement('div');
    card.className = 'upgrade';
    const title = document.createElement('h3');
    title.textContent = up.name;
    const desc = document.createElement('p');
    desc.textContent = up.desc;
    const row = document.createElement('div');
    row.className = 'upgrade-row';

    const cost = document.createElement('div');
    cost.textContent = `$${up.cost.toLocaleString()}`;
    cost.style.fontWeight = '700';
    cost.style.color = isBought ? 'var(--muted)' : '#e6f2ff';

    const btn = document.createElement('button');
    btn.className = 'buy-btn';
    btn.textContent = isBought ? 'Purchased' : 'Buy';
    btn.disabled = isBought || money < up.cost;
    if (isBought) {
      const badge = document.createElement('div');
      badge.className = 'purchased-badge';
      badge.textContent = 'BOUGHT';
      row.appendChild(badge);
    } else {
      btn.addEventListener('click', () => buyUpgrade(up.id));
      row.appendChild(btn);
    }

    row.appendChild(cost);
    card.appendChild(title);
    card.appendChild(desc);
    card.appendChild(row);

    upgradesListEl.appendChild(card);
  }

  shopBalanceEl.textContent = `$${money.toLocaleString()}`;
}

// buying logic
function buyUpgrade(id) {
  const up = upgrades.find(u => u.id === id);
  if (!up) return;
  if (money < up.cost) return;
  if (purchased.includes(id)) return;

  money -= up.cost;
  purchased.push(id);
  // save purchased and money
  localStorage.setItem(STORAGE_KEYS.money, String(money));
  localStorage.setItem(STORAGE_KEYS.purchased, JSON.stringify(purchased));
  // recompute stats and re-render
  recomputeFromPurchased();
  updateMoney();
  renderShop();
  updateCpsDisplay();
}

// click handler
function handleClick() {
  // calculate click amount:
  let amount = baseClick * clickMultiplier * globalMultiplier;
  // check crit
  if (critChance > 0) {
    const r = Math.random() * 100;
    if (r < critChance) {
      amount = amount * 2;
      // small visual feedback
      flashMoney('+CRIT!');
    }
  }
  addMoney(Math.round(amount));
  popAnimation(clicker);
}

clicker.addEventListener('click', handleClick);

// keyboard space to click
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    if (document.activeElement && ['INPUT','TEXTAREA','BUTTON'].includes(document.activeElement.tagName)) return;
    e.preventDefault();
    clicker.click();
  } else if (e.key === 's' || e.key === 'S') {
    // quick open shop with 's'
    openShop();
  }
});

// money add/save/update
function addMoney(amount){
  money += amount;
  localStorage.setItem(STORAGE_KEYS.money, String(money));
  updateMoney();
}
function updateMoney(){
  moneyEl.textContent = `$${money.toLocaleString()}`;
  shopBalanceEl.textContent = `$${money.toLocaleString()}`;
}

// small pop animation using Web Animations API (falls back gracefully)
function popAnimation(el){
  if (el.animate){
    el.animate([
      { transform: 'scale(1)', boxShadow: '0 8px 30px rgba(227,27,27,0.18)' },
      { transform: 'scale(1.06)', boxShadow: '0 18px 40px rgba(227,27,27,0.28)' },
      { transform: 'scale(1)', boxShadow: '0 8px 30px rgba(227,27,27,0.18)' },
    ], { duration: 200, easing: 'cubic-bezier(.2,.9,.2,1)' });
  }
}

// small flash when crit happens
function flashMoney(text) {
  const el = document.createElement('div');
  el.textContent = text;
  el.style.position = 'fixed';
  el.style.left = '50%';
  el.style.top = '40%';
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

// shop open/close
function openShop(){
  shopOverlay.classList.remove('hidden');
  shopOverlay.setAttribute('aria-hidden', 'false');
  renderShop();
}
function closeShop(){
  shopOverlay.classList.add('hidden');
  shopOverlay.setAttribute('aria-hidden', 'true');
}

openShopBtn.addEventListener('click', openShop);
closeShopBtn.addEventListener('click', closeShop);
closeShopBtn2.addEventListener('click', closeShop);
shopOverlay.addEventListener('click', (e) => {
  if (e.target === shopOverlay) closeShop();
});

// CPS logic: add cps every second
setInterval(() => {
  if (cps > 0) {
    const gain = Math.round(cps * globalMultiplier);
    if (gain > 0) addMoney(gain);
  }
}, 1000);

// we will display CPS including multipliers
function updateCpsDisplay() {
  const display = Math.round(cps * globalMultiplier);
  cpsEl.textContent = `${display.toLocaleString()} /s`;
}

// initialize
recomputeFromPurchased();
updateMoney();
renderShop();
updateCpsDisplay();

// small visual initial pulse (optional)
if (clicker.animate){
  clicker.animate([
    { transform: 'translateY(0)' },
    { transform: 'translateY(-6px)' },
    { transform: 'translateY(0)' }
  ], { duration: 900, iterations: 1, easing: 'ease-out' });
}

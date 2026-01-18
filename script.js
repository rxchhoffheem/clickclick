const moneyEl = document.getElementById('money');
const clicker = document.getElementById('clicker');

let money = parseInt(localStorage.getItem('sim_money') || '0', 10);
updateMoney();

clicker.addEventListener('click', () => {
  addMoney(1);
  popAnimation(clicker);
});

document.addEventListener('keydown', (e) => {
  // Spacebar to click
  if (e.code === 'Space') {
    e.preventDefault();
    clicker.click();
  }
});

function addMoney(amount){
  money += amount;
  localStorage.setItem('sim_money', String(money));
  updateMoney();
}

function updateMoney(){
  moneyEl.textContent = `$${money.toLocaleString()}`;
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

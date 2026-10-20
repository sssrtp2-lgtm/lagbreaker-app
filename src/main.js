const navItems = document.querySelectorAll('.nav-item');
const views = document.querySelectorAll('.view-section');

navItems.forEach(item => {
  item.addEventListener('click', () => {
    navItems.forEach(n => n.classList.remove('active'));
    views.forEach(v => v.classList.remove('active'));
    item.classList.add('active');
    document.getElementById(item.dataset.target).classList.add('active');
  });
});

// Смена тем
const themeBtns = document.querySelectorAll('[data-set-theme]');
function applyTheme(t) {
  document.body.setAttribute('data-theme', t);
  localStorage.setItem('lb_theme', t);
  themeBtns.forEach(b => b.classList.toggle('active', b.getAttribute('data-set-theme') === t));
}
applyTheme(localStorage.getItem('lb_theme') || 'pink');
themeBtns.forEach(b => b.addEventListener('click', () => applyTheme(b.getAttribute('data-set-theme'))));

function getInvoke() {
  if (!window.__TAURI__) return null;
  return window.__TAURI__.core ? window.__TAURI__.core.invoke : window.__TAURI__.tauri.invoke;
}

// Запуск игр
const gameSelect = document.getElementById('game-select');
const launchBtn = document.getElementById('launch-game-btn');
const launchText = document.getElementById('launch-btn-text');
const statusSub = document.getElementById('status-sub');

async function startGame(game) {
  const invoke = getInvoke();
  if (!invoke) return;
  launchText.textContent = '...';
  try {
    statusSub.textContent = await invoke('launch_game', { game });
    statusSub.style.color = 'var(--acc)';
  } catch (e) {
    statusSub.textContent = String(e);
    statusSub.style.color = '#ff4455';
  } finally {
    setTimeout(() => { launchText.textContent = 'ИГРАТЬ'; }, 1200);
  }
}

launchBtn.addEventListener('click', () => startGame(gameSelect.value));
document.querySelectorAll('.game-card[data-game]').forEach(c => {
  c.addEventListener('click', () => {
    gameSelect.value = c.dataset.game;
    document.querySelector('[data-target="dashboard-view"]').click();
    startGame(c.dataset.game);
  });
});

// Управление VPN
const boostBtn = document.getElementById('boost-btn');
const statusText = document.getElementById('status-text');
const totalPing = document.getElementById('total-ping');
const chart = document.getElementById('chart');
const profileSelect = document.getElementById('profile');

let isConnected = false;
let isBusy = false;
let pingTimer;

for (let i = 0; i < 36; i++) {
  const bar = document.createElement('div');
  bar.className = 'bar';
  bar.style.height = (Math.random() * 20 + 10) + '%';
  chart.appendChild(bar);
}

boostBtn.addEventListener('click', async () => {
  if (isBusy) return;
  const invoke = getInvoke();
  if (!invoke) return;

  const target = !isConnected;
  const profile = profileSelect.value;
  isBusy = true;
  statusText.textContent = target ? 'Подключение...' : 'Отключение...';

  try {
    const res = await invoke('toggle_vpn', { profile, connect: target });
    console.log('Ответ VPN:', res);
    
    isConnected = target;
    
    // ВОТ ЭТА СТРОЧКА ВКЛЮЧАЕТ АНИМАЦИЮ НА BODY И ТУННЕЛЕ:
    document.body.classList.toggle('is-boosted', isConnected);
    
    boostBtn.classList.toggle('active', isConnected);
    profileSelect.disabled = isConnected;

    if (isConnected) {
      statusText.textContent = 'Оптимизировано';
      statusSub.textContent = 'Активен: ' + profile;
      statusSub.style.color = 'var(--acc)';
      totalPing.textContent = 'ON';
      pingTimer = setInterval(() => {
        for (let b of chart.children) b.style.height = (Math.random() * 45 + 35) + '%';
      }, 800);
    } else {
      statusText.textContent = 'Ожидание...';
      statusSub.textContent = 'Туннель отключен';
      statusSub.style.color = 'var(--mut)';
      totalPing.textContent = 'OFF';
      clearInterval(pingTimer);
    }
  } catch (err) {
    console.error('Ошибка VPN:', err);
    statusText.textContent = 'Ошибка';
    statusSub.textContent = String(err);
    statusSub.style.color = '#ff4455';
  } finally {
    isBusy = false;
  }
});
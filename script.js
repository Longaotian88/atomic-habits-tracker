/* =====================
   原子习惯追踪器 - JS
   ===================== */

// ─── 状态 ───────────────────────────────────────────────────────────────────
let state = {
  habits: [],        // { id, name, desc, target, color, cue, craving, response, reward, createdAt }
  completions: {},   // { 'YYYY-MM-DD': [habitId, ...] }
  identities: [],   // { id, text, why }
  stacks: []         // { id, anchor, newHabit, cue }
};

const LS_KEY = 'atomic_habits_v1';

// ─── 初始化 ────────────────────────────────────────────────────────────────────
function init() {
  loadState();
  renderAll();
  animateCompoundBars();
  setupEventListeners();
  updateTodayDate();
}

// ─── 存储 ─────────────────────────────────────────────────────────────────
function loadState() {
  try {
    const saved = localStorage.getItem(LS_KEY);
    if (saved) state = JSON.parse(saved);
  } catch (e) { console.warn('状态加载失败', e); }
}

function saveState() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch (e) { console.warn('状态保存失败', e); }
}

// ─── 辅助函数 ─────────────────────────────────────────────────────────────────
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function updateTodayDate() {
  const el = document.getElementById('todayDate');
  if (el) {
    const d = new Date();
    el.textContent = d.toLocaleDateString('zh-CN', { weekday: 'long', month: 'long', day: 'numeric' });
  }
}

function isCompleted(habitId) {
  const d = today();
  return (state.completions[d] || []).includes(habitId);
}

function getStreak(habitId) {
  let streak = 0;
  const d = new Date();
  while (true) {
    const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    if ((state.completions[dateStr] || []).includes(habitId)) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

function getLast30Days(habitId) {
  const days = [];
  const d = new Date();
  for (let i = 29; i >= 0; i--) {
    const dd = new Date(d);
    dd.setDate(dd.getDate() - i);
    const dateStr = `${dd.getFullYear()}-${String(dd.getMonth()+1).padStart(2,'0')}-${String(dd.getDate()).padStart(2,'0')}`;
    const isToday = dateStr === today();
    days.push({
      date: dateStr,
      completed: (state.completions[dateStr] || []).includes(habitId),
      isToday
    });
  }
  return days;
}

function scoreStars(completed, total) {
  if (total === 0) return '—';
  const pct = completed / total;
  if (pct >= 1) return '🌟🌟🌟';
  if (pct >= 0.6) return '🌟🌟';
  if (pct >= 0.3) return '🌟';
  return '';
}

// ─── 复利效应动画 ────────────────────────────────────────────────────────────────
function animateCompoundBars() {
  setTimeout(() => {
    const neg = document.getElementById('compoundNegative');
    const pos = document.getElementById('compoundPositive');
    if (neg) neg.style.width = '97%';
    if (pos) pos.style.width = '100%';
  }, 300);
}

// ─── 渲染全部 ───────────────────────────────────────────────────────────────
function renderAll() {
  renderScorecard();
  renderIdentities();
  renderStacks();
  renderHabits();
}

// ─── 渲染：得分卡 ────────────────────────────────────────────────────────
function renderScorecard() {
  const grid = document.getElementById('scorecardGrid');
  const scoreEl = document.getElementById('dailyScore');
  const totalEl = document.getElementById('totalHabits');
  const starsEl = document.getElementById('scoreStars');

  if (!grid) return;

  if (state.habits.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-state-icon">📋</div>
        <p>添加你的第一个习惯开始追踪</p>
      </div>`;
    scoreEl.textContent = '0';
    totalEl.textContent = '0';
    starsEl.textContent = '';
    return;
  }

  grid.innerHTML = state.habits.map(habit => {
    const done = isCompleted(habit.id);
    return `
      <div class="scorecard-item" data-id="${habit.id}">
        <div class="habit-dot" style="background:${habit.color || '#f97316'}"></div>
        <span class="scorecard-name">${habit.name}</span>
        <div class="scorecard-check ${done ? 'done' : ''}" data-habit="${habit.id}" title="${done ? '标记未完成' : '标记完成'}">
          ${done ? '✓' : ''}
        </div>
      </div>`;
  }).join('');

  const completedToday = state.habits.filter(h => isCompleted(h.id)).length;
  scoreEl.textContent = completedToday;
  totalEl.textContent = state.habits.length;
  starsEl.textContent = scoreStars(completedToday, state.habits.length);
}

// ─── 渲染：身份认同 ──────────────────────────────────────────────────────
function renderIdentities() {
  const grid = document.getElementById('identityGrid');
  if (!grid) return;

  if (state.identities.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-state-icon">🪪</div>
        <p>基于身份的习惯是最强大的。添加一个吧！</p>
      </div>`;
    return;
  }

  grid.innerHTML = state.identities.map(id => `
    <div class="identity-card">
      <div class="identity-text">"${id.text}"</div>
      ${id.why ? `<div class="identity-why">${id.why}</div>` : ''}
      <div class="identity-actions">
        <button class="btn-delete" onclick="deleteIdentity('${id.id}')">删除</button>
      </div>
    </div>
  `).join('');
}

// ─── 渲染：习惯堆叠 ──────────────────────────────────────────────────────────
function renderStacks() {
  const grid = document.getElementById('stacksGrid');
  if (!grid) return;

  if (state.stacks.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-state-icon">🔗</div>
        <p>习惯堆叠将新习惯与已有习惯联系起来</p>
      </div>`;
    return;
  }

  grid.innerHTML = state.stacks.map(s => `
    <div class="stack-card">
      <div class="stack-anchor">在……之后</div>
      <div class="stack-action">${s.anchor}</div>
      <div class="stack-after">我将……</div>
      <div class="stack-action" style="color:var(--accent)">${s.newHabit}</div>
      ${s.cue ? `<div class="stack-cue">🔔 提示：${s.cue}</div>` : ''}
      <div class="identity-actions" style="margin-top:10px">
        <button class="btn-delete" onclick="deleteStack('${s.id}')">删除</button>
      </div>
    </div>
  `).join('');
}

// ─── 渲染：习惯 ─────────────────────────────────────────────────────────
function renderHabits() {
  const list = document.getElementById('habitsList');
  if (!list) return;

  if (state.habits.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🎯</div>
        <p>还没有习惯。点击"+ 添加习惯"开始吧！</p>
      </div>`;
    return;
  }

  list.innerHTML = state.habits.map(habit => {
    const streak = getStreak(habit.id);
    const last30 = getLast30Days(habit.id);
    const streakClass = streak > 0 ? '' : 'streak-zero';

    return `
      <div class="habit-card" data-habit="${habit.id}">
        <div class="habit-card-header">
          <div class="habit-title-row">
            <div class="habit-dot" style="background:${habit.color || '#f97316'}"></div>
            <div>
              <div class="habit-name">${habit.name}</div>
              ${habit.desc ? `<div class="habit-desc">${habit.desc}</div>` : ''}
            </div>
          </div>
          <div class="habit-actions">
            <span class="streak-badge ${streakClass}">🔥 ${streak} 天连续</span>
            <button class="btn-icon" onclick="deleteHabit('${habit.id}')" title="删除习惯" style="font-size:0.9rem;width:30px;height:30px">🗑️</button>
          </div>
        </div>

        ${habit.cue || habit.craving || habit.response || habit.reward ? `
        <div class="habit-loop">
          <div class="loop-part">
            <div class="loop-part-label">提示</div>
            <div class="loop-part-val">${habit.cue || '—'}</div>
          </div>
          <div class="loop-sep">→</div>
          <div class="loop-part">
            <div class="loop-part-label">渴望</div>
            <div class="loop-part-val">${habit.craving || '—'}</div>
          </div>
          <div class="loop-sep">→</div>
          <div class="loop-part">
            <div class="loop-part-label">反应</div>
            <div class="loop-part-val">${habit.response || '—'}</div>
          </div>
          <div class="loop-sep">→</div>
          <div class="loop-part">
            <div class="loop-part-label">奖励</div>
            <div class="loop-part-val">${habit.reward || '—'}</div>
          </div>
        </div>` : ''}
        <button class="loop-part-edit" style="margin-bottom:10px" onclick="openLoopModal('${habit.id}')">
          ${habit.cue || habit.craving || habit.response || habit.reward ? '✏️ 编辑循环' : '+ 添加习惯循环'}
        </button>

        <div class="streak-calendar">
          <div class="streak-calendar-label">
            <span>最近30天</span>
            <span>${streak > 0 ? '🔥 别打断链！' : '今天开始你的链！'}</span>
          </div>
          <div class="streak-grid">
            ${last30.map(day => `
              <div class="streak-day ${day.completed ? 'completed' : ''} ${day.isToday ? 'today' : ''}"
                   title="${day.date}${day.completed ? ' ✓' : ''}"></div>
            `).join('')}
          </div>
        </div>
      </div>`;
  }).join('');
}

// ─── 切换完成状态 ───────────────────────────────────────────────────────
function toggleHabit(habitId) {
  const d = today();
  if (!state.completions[d]) state.completions[d] = [];
  const idx = state.completions[d].indexOf(habitId);
  if (idx >= 0) {
    state.completions[d].splice(idx, 1);
  } else {
    state.completions[d].push(habitId);
  }
  saveState();
  renderAll();
}

// ─── 删除习惯 ────────────────────────────────────────────────────────────
function deleteHabit(habitId) {
  if (!confirm('删除此习惯吗？此操作无法撤销。')) return;
  state.habits = state.habits.filter(h => h.id !== habitId);
  // 清理完成记录
  Object.keys(state.completions).forEach(date => {
    state.completions[date] = state.completions[date].filter(id => id !== habitId);
  });
  saveState();
  renderAll();
}

// ─── 删除身份 ─────────────────────────────────────────────────────────
function deleteIdentity(id) {
  state.identities = state.identities.filter(i => i.id !== id);
  saveState();
  renderIdentities();
}

// ─── 删除堆叠 ───────────────────────────────────────────────────────────
function deleteStack(id) {
  state.stacks = state.stacks.filter(s => s.id !== id);
  saveState();
  renderStacks();
}

// ─── 弹窗：打开/关闭 ───────────────────────────────────────────────────────
function openModal(id) {
  document.getElementById(id)?.classList.add('open');
}
function closeModal(id) {
  document.getElementById(id)?.classList.remove('open');
}

function closeAllModals() {
  document.querySelectorAll('.modal').forEach(m => m.classList.remove('open'));
}

// ─── 循环弹窗 ──────────────────────────────────────────────────────────────
function openLoopModal(habitId) {
  const habit = state.habits.find(h => h.id === habitId);
  if (!habit) return;
  document.getElementById('loopHabitId').value = habitId;
  document.getElementById('loopCue').value = habit.cue || '';
  document.getElementById('loopCraving').value = habit.craving || '';
  document.getElementById('loopResponse').value = habit.response || '';
  document.getElementById('loopReward').value = habit.reward || '';
  openModal('loopModal');
}

// ─── 事件监听 ─────────────────────────────────────────────────────────
function setupEventListeners() {
  // 深色模式切换
  const darkToggle = document.getElementById('darkModeToggle');
  darkToggle?.addEventListener('click', () => {
    const html = document.documentElement;
    const current = html.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    darkToggle.textContent = next === 'dark' ? '☀️' : '🌙';
    darkToggle.title = next === 'dark' ? '切换浅色模式' : '切换深色模式';
    localStorage.setItem('theme', next);
  });

  // 加载保存的主题
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
    document.getElementById('darkModeToggle').textContent = savedTheme === 'dark' ? '☀️' : '🌙';
    document.getElementById('darkModeToggle').title = savedTheme === 'dark' ? '切换浅色模式' : '切换深色模式';
  }

  // 添加习惯按钮
  document.getElementById('addHabitBtn')?.addEventListener('click', () => openModal('habitModal'));
  document.getElementById('addIdentityBtn')?.addEventListener('click', () => openModal('identityModal'));
  document.getElementById('addStackBtn')?.addEventListener('click', () => openModal('stackModal'));

  // 弹窗遮罩关闭
  document.querySelectorAll('.modal-backdrop').forEach(el => {
    el.addEventListener('click', closeAllModals);
  });
  document.querySelectorAll('.modal-close').forEach(el => {
    el.addEventListener('click', closeAllModals);
  });

  // 颜色选择器
  document.querySelectorAll('.color-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
      dot.classList.add('active');
    });
  });

  // 得分卡点击（事件委托）
  document.getElementById('scorecardGrid')?.addEventListener('click', (e) => {
    const check = e.target.closest('.scorecard-check');
    if (check) toggleHabit(check.dataset.habit);
  });

  // 习惯表单
  document.getElementById('habitForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('habitName').value.trim();
    if (!name) return;
    const activeColor = document.querySelector('.color-dot.active');
    const habit = {
      id: generateId(),
      name,
      desc: document.getElementById('habitDesc').value.trim(),
      target: parseInt(document.getElementById('habitTarget').value),
      color: activeColor?.dataset.color || '#f97316',
      cue: document.getElementById('habitCue').value.trim(),
      craving: document.getElementById('habitCraving').value.trim(),
      response: document.getElementById('habitResponse').value.trim(),
      reward: document.getElementById('habitReward').value.trim(),
      createdAt: new Date().toISOString()
    };
    state.habits.push(habit);
    saveState();
    e.target.reset();
    document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
    document.querySelector('.color-dot[data-color="#f97316"]')?.classList.add('active');
    closeModal('habitModal');
    renderAll();
  });

  // 身份表单
  document.getElementById('identityForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = document.getElementById('identityText').value.trim();
    if (!text) return;
    state.identities.push({
      id: generateId(),
      text,
      why: document.getElementById('identityWhy').value.trim()
    });
    saveState();
    e.target.reset();
    closeModal('identityModal');
    renderIdentities();
  });

  // 堆叠表单
  document.getElementById('stackForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const anchor = document.getElementById('stackAnchor').value.trim();
    const newHabit = document.getElementById('stackNew').value.trim();
    if (!anchor || !newHabit) return;
    state.stacks.push({
      id: generateId(),
      anchor,
      newHabit,
      cue: document.getElementById('stackCue').value.trim()
    });
    saveState();
    e.target.reset();
    closeModal('stackModal');
    renderStacks();
  });

  // 循环表单
  document.getElementById('loopForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const habitId = document.getElementById('loopHabitId').value;
    const habit = state.habits.find(h => h.id === habitId);
    if (!habit) return;
    habit.cue = document.getElementById('loopCue').value.trim();
    habit.craving = document.getElementById('loopCraving').value.trim();
    habit.response = document.getElementById('loopResponse').value.trim();
    habit.reward = document.getElementById('loopReward').value.trim();
    saveState();
    closeModal('loopModal');
    renderHabits();
  });

  // 键盘快捷键
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAllModals();
  });
}

// ─── 启动 ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);

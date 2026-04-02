/* =====================
   ATOMIC HABITS TRACKER - JS
   ===================== */

// ─── State ───────────────────────────────────────────────────────────────────
let state = {
  habits: [],        // { id, name, desc, target, color, cue, craving, response, reward, createdAt }
  completions: {},   // { 'YYYY-MM-DD': [habitId, ...] }
  identities: [],   // { id, text, why }
  stacks: []         // { id, anchor, newHabit, cue }
};

const LS_KEY = 'atomic_habits_v1';

// ─── Init ────────────────────────────────────────────────────────────────────
function init() {
  loadState();
  renderAll();
  animateCompoundBars();
  setupEventListeners();
  updateTodayDate();
}

// ─── Storage ─────────────────────────────────────────────────────────────────
function loadState() {
  try {
    const saved = localStorage.getItem(LS_KEY);
    if (saved) state = JSON.parse(saved);
  } catch (e) { console.warn('Failed to load state', e); }
}

function saveState() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch (e) { console.warn('Failed to save state', e); }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
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
    el.textContent = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
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

// ─── Compound Effect Animation ────────────────────────────────────────────────
function animateCompoundBars() {
  setTimeout(() => {
    const neg = document.getElementById('compoundNegative');
    const pos = document.getElementById('compoundPositive');
    if (neg) neg.style.width = '97%';
    if (pos) pos.style.width = '100%';
  }, 300);
}

// ─── Render All ───────────────────────────────────────────────────────────────
function renderAll() {
  renderScorecard();
  renderIdentities();
  renderStacks();
  renderHabits();
}

// ─── Render: Scorecard ────────────────────────────────────────────────────────
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
        <p>Add your first habit to start tracking</p>
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
        <div class="scorecard-check ${done ? 'done' : ''}" data-habit="${habit.id}" title="${done ? 'Mark incomplete' : 'Mark complete'}">
          ${done ? '✓' : ''}
        </div>
      </div>`;
  }).join('');

  const completedToday = state.habits.filter(h => isCompleted(h.id)).length;
  scoreEl.textContent = completedToday;
  totalEl.textContent = state.habits.length;
  starsEl.textContent = scoreStars(completedToday, state.habits.length);
}

// ─── Render: Identities ──────────────────────────────────────────────────────
function renderIdentities() {
  const grid = document.getElementById('identityGrid');
  if (!grid) return;

  if (state.identities.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-state-icon">🪪</div>
        <p>Identity-based habits are the most powerful. Add one!</p>
      </div>`;
    return;
  }

  grid.innerHTML = state.identities.map(id => `
    <div class="identity-card">
      <div class="identity-text">"${id.text}"</div>
      ${id.why ? `<div class="identity-why">${id.why}</div>` : ''}
      <div class="identity-actions">
        <button class="btn-delete" onclick="deleteIdentity('${id.id}')">Delete</button>
      </div>
    </div>
  `).join('');
}

// ─── Render: Stacks ──────────────────────────────────────────────────────────
function renderStacks() {
  const grid = document.getElementById('stacksGrid');
  if (!grid) return;

  if (state.stacks.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-state-icon">🔗</div>
        <p>Habit stacking links new habits to existing ones</p>
      </div>`;
    return;
  }

  grid.innerHTML = state.stacks.map(s => `
    <div class="stack-card">
      <div class="stack-anchor">After...</div>
      <div class="stack-action">${s.anchor}</div>
      <div class="stack-after">I will...</div>
      <div class="stack-action" style="color:var(--accent)">${s.newHabit}</div>
      ${s.cue ? `<div class="stack-cue">🔔 Cue: ${s.cue}</div>` : ''}
      <div class="identity-actions" style="margin-top:10px">
        <button class="btn-delete" onclick="deleteStack('${s.id}')">Delete</button>
      </div>
    </div>
  `).join('');
}

// ─── Render: Habits ─────────────────────────────────────────────────────────
function renderHabits() {
  const list = document.getElementById('habitsList');
  if (!list) return;

  if (state.habits.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🎯</div>
        <p>No habits yet. Click "+ Add Habit" to get started!</p>
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
            <span class="streak-badge ${streakClass}">🔥 ${streak} day streak</span>
            <button class="btn-icon" onclick="deleteHabit('${habit.id}')" title="Delete habit" style="font-size:0.9rem;width:30px;height:30px">🗑️</button>
          </div>
        </div>

        ${habit.cue || habit.craving || habit.response || habit.reward ? `
        <div class="habit-loop">
          <div class="loop-part">
            <div class="loop-part-label">Cue</div>
            <div class="loop-part-val">${habit.cue || '—'}</div>
          </div>
          <div class="loop-sep">→</div>
          <div class="loop-part">
            <div class="loop-part-label">Craving</div>
            <div class="loop-part-val">${habit.craving || '—'}</div>
          </div>
          <div class="loop-sep">→</div>
          <div class="loop-part">
            <div class="loop-part-label">Response</div>
            <div class="loop-part-val">${habit.response || '—'}</div>
          </div>
          <div class="loop-sep">→</div>
          <div class="loop-part">
            <div class="loop-part-label">Reward</div>
            <div class="loop-part-val">${habit.reward || '—'}</div>
          </div>
        </div>` : ''}
        <button class="loop-part-edit" style="margin-bottom:10px" onclick="openLoopModal('${habit.id}')">
          ${habit.cue || habit.craving || habit.response || habit.reward ? '✏️ Edit Loop' : '+ Add Habit Loop'}
        </button>

        <div class="streak-calendar">
          <div class="streak-calendar-label">
            <span>Last 30 days</span>
            <span>${streak > 0 ? '🔥 Don\'t break the chain!' : 'Start your chain today!'}</span>
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

// ─── Toggle Completion ───────────────────────────────────────────────────────
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

// ─── Delete Habit ────────────────────────────────────────────────────────────
function deleteHabit(habitId) {
  if (!confirm('Delete this habit? This cannot be undone.')) return;
  state.habits = state.habits.filter(h => h.id !== habitId);
  // Clean up completions
  Object.keys(state.completions).forEach(date => {
    state.completions[date] = state.completions[date].filter(id => id !== habitId);
  });
  saveState();
  renderAll();
}

// ─── Delete Identity ─────────────────────────────────────────────────────────
function deleteIdentity(id) {
  state.identities = state.identities.filter(i => i.id !== id);
  saveState();
  renderIdentities();
}

// ─── Delete Stack ────────────────────────────────────────────────────────────
function deleteStack(id) {
  state.stacks = state.stacks.filter(s => s.id !== id);
  saveState();
  renderStacks();
}

// ─── Modal: Open/Close ───────────────────────────────────────────────────────
function openModal(id) {
  document.getElementById(id)?.classList.add('open');
}
function closeModal(id) {
  document.getElementById(id)?.classList.remove('open');
}

function closeAllModals() {
  document.querySelectorAll('.modal').forEach(m => m.classList.remove('open'));
}

// ─── Loop Modal ──────────────────────────────────────────────────────────────
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

// ─── Event Listeners ─────────────────────────────────────────────────────────
function setupEventListeners() {
  // Dark mode toggle
  const darkToggle = document.getElementById('darkModeToggle');
  darkToggle?.addEventListener('click', () => {
    const html = document.documentElement;
    const current = html.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    darkToggle.textContent = next === 'dark' ? '☀️' : '🌙';
    localStorage.setItem('theme', next);
  });

  // Load saved theme
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
    document.getElementById('darkModeToggle').textContent = savedTheme === 'dark' ? '☀️' : '🌙';
  }

  // Add habit button
  document.getElementById('addHabitBtn')?.addEventListener('click', () => openModal('habitModal'));
  document.getElementById('addIdentityBtn')?.addEventListener('click', () => openModal('identityModal'));
  document.getElementById('addStackBtn')?.addEventListener('click', () => openModal('stackModal'));

  // Modal backdrop close
  document.querySelectorAll('.modal-backdrop').forEach(el => {
    el.addEventListener('click', closeAllModals);
  });
  document.querySelectorAll('.modal-close').forEach(el => {
    el.addEventListener('click', closeAllModals);
  });

  // Color picker
  document.querySelectorAll('.color-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
      dot.classList.add('active');
    });
  });

  // Scorecard check clicks (event delegation)
  document.getElementById('scorecardGrid')?.addEventListener('click', (e) => {
    const check = e.target.closest('.scorecard-check');
    if (check) toggleHabit(check.dataset.habit);
  });

  // Habit Form
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

  // Identity Form
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

  // Stack Form
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

  // Loop Form
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

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAllModals();
  });
}

// ─── Start ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);

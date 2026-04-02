/* =====================
   原子习惯追踪器 - JS (增强版)
   ===================== */

// ─── 状态 ───────────────────────────────────────────────────────────────────
let state = {
  habits: [],       // { id, name, desc, target, color, cue, craving, response, reward, createdAt, archived }
  completions: {},  // { 'YYYY-MM-DD': [habitId, ...] }
  identities: [],   // { id, text, why }
  stacks: []        // { id, anchor, newHabit, cue }
};

const LS_KEY = 'atomic_habits_v2';
const REFLECTION_KEY = 'atomic_habits_reflection';

// Habit tips pool
const HABIT_TIPS = [
  '💡 提示：把习惯和特定时间和地点绑定，成功率提升2倍！',
  '💡 提示：从极小的行为开始（1个俯卧撑！），让阻力接近零。',
  '💡 提示：给每个习惯完成后立即庆祝，大脑会记住这个快乐的关联！',
  '💡 提示：把手机放到另一个房间，减少干扰，提升专注力。',
  '💡 提示：习惯堆叠 = "在 [旧习惯] 之后，我将 [新习惯]"，利用已有习惯带动新习惯。',
  '💡 提示：睡前把第二天要用的东西（运动服、书本）准备好，减少启动阻力。',
  '💡 提示：让好习惯显而易见——把跑鞋放在门口，把书放在枕头边。',
  '💡 提示：习惯回路 = 提示→渴望→反应→奖励，缺一不可！',
  '💡 提示：连续做7天就会形成初步习惯，别打断链条！🔥',
  '💡 提示：每晚睡前回顾：今天哪个习惯做得最好？明天如何改进？'
];

// Example habits
const EXAMPLE_HABITS = [
  { name: '晨跑 20 分钟', desc: '早起跑步，保持活力', color: '#10b981' },
  { name: '阅读 30 分钟', desc: '每天读一本好书', color: '#3b82f6' },
  { name: '写日记 10 分钟', desc: '记录一天的想法', color: '#8b5cf6' }
];

// Milestone data
const MILESTONES = [
  { days: 7, icon: '🎖️', label: '7天里程碑', sub: '初步习惯已形成，继续加油！' },
  { days: 21, icon: '🏅', label: '21天里程碑', sub: '21天养成习惯，你做到了！' },
  { days: 66, icon: '🏆', label: '66天里程碑', sub: '66天 = 真正的习惯养成！' },
  { days: 100, icon: '👑', label: '100天里程碑', sub: '百日坚持，卓越非凡！' }
];

// ─── 初始化 ────────────────────────────────────────────────────────────────────
function init() {
  loadState();
  renderAll();
  animateCompoundBars();
  setupEventListeners();
  updateTodayDate();
  loadReflection();
  rotateHabitTip();
  startTipRotation();
}

// ─── 存储 ─────────────────────────────────────────────────────────────────
function loadState() {
  try {
    const saved = localStorage.getItem(LS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Migrate v1 state
      if (parsed.habits && !parsed.habits[0]?.hasOwnProperty('archived')) {
        parsed.habits = parsed.habits.map(h => ({ ...h, archived: false }));
      }
      state = parsed;
    }
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

function getActiveHabits() {
  return state.habits.filter(h => !h.archived);
}

function getArchivedHabits() {
  return state.habits.filter(h => h.archived);
}

// ─── 每日反思 ─────────────────────────────────────────────────────────────
function loadReflection() {
  const saved = localStorage.getItem(REFLECTION_KEY + '_' + today());
  const el = document.getElementById('reflectionText');
  const savedEl = document.getElementById('reflectionSaved');
  if (el && saved) {
    el.value = saved;
    if (savedEl) savedEl.textContent = '✓ 已保存';
  }
}

function saveReflection() {
  const text = document.getElementById('reflectionText')?.value.trim() || '';
  const savedEl = document.getElementById('reflectionSaved');
  localStorage.setItem(REFLECTION_KEY + '_' + today(), text);
  if (savedEl) {
    savedEl.textContent = '✓ 已保存';
    setTimeout(() => { if (savedEl) savedEl.textContent = ''; }, 2000);
  }
}

// ─── 习惯提示轮换 ──────────────────────────────────────────────────────────
let tipIndex = 0;
function rotateHabitTip() {
  const el = document.getElementById('habitTipText');
  if (el) {
    el.textContent = HABIT_TIPS[tipIndex % HABIT_TIPS.length];
  }
}
function startTipRotation() {
  setInterval(() => {
    tipIndex++;
    const el = document.getElementById('habitTipText');
    if (el && document.getElementById('habitModal')?.classList.contains('open')) {
      el.textContent = HABIT_TIPS[tipIndex % HABIT_TIPS.length];
    }
  }, 5000);
}

// ─── 进度仪表盘 ───────────────────────────────────────────────────────────
function getWeekDays() {
  const days = [];
  const now = new Date();
  const dayOfWeek = now.getDay() || 7;
  for (let i = 1; i <= dayOfWeek; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - (dayOfWeek - i));
    const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const label = d.toLocaleDateString('zh-CN', { weekday: 'short', day: 'numeric' });
    const isToday = dateStr === today();
    const completedCount = getActiveHabits().filter(h => (state.completions[dateStr] || []).includes(h.id)).length;
    const totalCount = getActiveHabits().length;
    const pct = totalCount > 0 ? completedCount / totalCount : 0;
    days.push({ dateStr, label, completedCount, totalCount, pct, isToday });
  }
  return days;
}

function getWeeklyCompletionRate() {
  const weekDays = getWeekDays();
  if (weekDays.length === 0) return 0;
  const totalPct = weekDays.reduce((sum, d) => sum + d.pct, 0);
  return Math.round((totalPct / weekDays.length) * 100);
}

function getMonthlyBestHabit() {
  const now = new Date();
  const monthStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const habitCounts = {};
  getActiveHabits().forEach(h => { habitCounts[h.id] = 0; });
  Object.keys(state.completions).forEach(date => {
    if (date.startsWith(monthStr)) {
      (state.completions[date] || []).forEach(id => {
        if (habitCounts[id] !== undefined) habitCounts[id]++;
      });
    }
  });
  let best = null;
  let bestStreak = 0;
  getActiveHabits().forEach(h => {
    const streak = getStreak(h.id);
    if (streak > bestStreak) {
      bestStreak = streak;
      best = h;
    }
  });
  return best;
}

function renderDashboard() {
  const weekDays = getWeekDays();
  const weeklyPct = getWeeklyCompletionRate();
  const bestHabit = getMonthlyBestHabit();

  // Progress ring
  const ring = document.getElementById('progressRing');
  const pctEl = document.getElementById('weeklyPct');
  if (ring) {
    const circumference = 2 * Math.PI * 52; // ≈ 326.73
    const offset = circumference * (1 - weeklyPct / 100);
    ring.style.strokeDashoffset = offset;
    if (pctEl) pctEl.textContent = weeklyPct + '%';
  }

  // Weekly bar chart
  const barChart = document.getElementById('weeklyBarChart');
  if (barChart) {
    const dayLabels = ['一', '二', '三', '四', '五', '六', '日'];
    const fullWeek = [];
    const now = new Date();
    const dayOfWeek = now.getDay() || 7;
    for (let i = 1; i <= 7; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - (dayOfWeek - i));
      const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const isToday = dateStr === today();
      const completedCount = getActiveHabits().filter(h => (state.completions[dateStr] || []).includes(h.id)).length;
      const totalCount = getActiveHabits().length;
      const pct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
      fullWeek.push({ dateStr, label: dayLabels[i-1], pct, isToday, completedCount, totalCount });
    }

    barChart.innerHTML = fullWeek.map(d => {
      const fillClass = d.pct === 0 ? 'zero' : d.pct < 100 ? 'partial' : '';
      return `
        <div class="wbar-wrap">
          <div class="wbar-track">
            <div class="wbar-fill ${fillClass}" style="height:${Math.max(d.pct, 4)}%"></div>
          </div>
          <div class="wbar-label" style="color:${d.isToday ? 'var(--accent)' : 'var(--text-muted)'};font-weight:${d.isToday ? '700' : '600'}">${d.label}</div>
        </div>`;
    }).join('');
  }

  // Best habit
  const bestEl = document.getElementById('bestHabitDisplay');
  if (bestEl) {
    if (!bestHabit || getStreak(bestHabit.id) === 0) {
      bestEl.innerHTML = `<div class="best-habit-empty">暂无数据<br><span>坚持完成习惯解锁此成就！</span></div>`;
    } else {
      const streak = getStreak(bestHabit.id);
      bestEl.innerHTML = `
        <div class="best-trophy">🏆</div>
        <div class="best-habit-name" style="color:${bestHabit.color || 'var(--accent)'}">${bestHabit.name}</div>
        <div class="best-habit-streak">🔥 ${streak} 天连续</div>
        <div class="best-habit-meta">本月坚持最久</div>`;
    }
  }
}

// ─── 彩屑庆祝动画 ─────────────────────────────────────────────────────────
function launchConfetti() {
  const canvas = document.getElementById('confettiCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = [];
  const colors = ['#f97316', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#eab308', '#ef4444'];

  for (let i = 0; i < 120; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * 100,
      vx: (Math.random() - 0.5) * 4,
      vy: Math.random() * 3 + 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 8 + 4,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10,
      shape: Math.random() > 0.5 ? 'rect' : 'circle',
      opacity: 1
    });
  }

  let frame = 0;
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.08;
      p.rotation += p.rotationSpeed;
      p.opacity = Math.max(0, 1 - p.y / canvas.height);

      ctx.save();
      ctx.globalAlpha = p.opacity;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation * Math.PI / 180);
      ctx.fillStyle = p.color;
      if (p.shape === 'rect') {
        ctx.fillRect(-p.size/2, -p.size/4, p.size, p.size/2);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size/2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });

    frame++;
    if (frame < 180) {
      requestAnimationFrame(animate);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }
  animate();
}

function celebrateMilestone(days) {
  const milestone = MILESTONES.find(m => m.days === days);
  if (!milestone) return;

  // Show banner
  const habitsList = document.getElementById('habitsList');
  if (habitsList) {
    const banner = document.createElement('div');
    banner.className = 'milestone-banner';
    banner.id = 'milestoneBanner';
    banner.innerHTML = `
      <div class="milestone-banner-icon">${milestone.icon}</div>
      <div class="milestone-banner-text">${milestone.label}达成！🎉</div>
      <div class="milestone-banner-sub">${milestone.sub}</div>`;
    habitsList.parentNode.insertBefore(banner, habitsList);
    setTimeout(() => {
      const b = document.getElementById('milestoneBanner');
      if (b) b.remove();
    }, 5000);
  }

  launchConfetti();
}

// ─── 复利效应动画 ────────────────────────────────────────────────────────────
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
  renderDashboard();
  renderScorecard();
  renderIdentities();
  renderStacks();
  renderHabits();
  renderArchivedSection();
}

// ─── 渲染：得分卡 ────────────────────────────────────────────────────────
function renderScorecard() {
  const grid = document.getElementById('scorecardGrid');
  const scoreEl = document.getElementById('dailyScore');
  const totalEl = document.getElementById('totalHabits');
  const starsEl = document.getElementById('scoreStars');

  if (!grid) return;

  const activeHabits = getActiveHabits();

  if (activeHabits.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <span class="empty-state-icon">📋</span>
        <h3>开始你的习惯之旅</h3>
        <p>添加你的第一个习惯，开启自我提升之路</p>
        <div class="example-habits">
          ${EXAMPLE_HABITS.map(ex => `
            <button class="example-habit-btn" onclick="addExampleHabit('${ex.name}','${ex.desc}','${ex.color}')">
              + ${ex.name}
            </button>
          `).join('')}
        </div>
      </div>`;
    scoreEl.textContent = '0';
    totalEl.textContent = '0';
    starsEl.textContent = '';
    return;
  }

  grid.innerHTML = activeHabits.map(habit => {
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

  const completedToday = activeHabits.filter(h => isCompleted(h.id)).length;
  scoreEl.textContent = completedToday;
  totalEl.textContent = activeHabits.length;
  starsEl.textContent = scoreStars(completedToday, activeHabits.length);
}

// ─── 快速添加示例习惯 ─────────────────────────────────────────────────────
function addExampleHabit(name, desc, color) {
  const habit = {
    id: generateId(),
    name,
    desc,
    target: 7,
    color,
    cue: '', craving: '', response: '', reward: '',
    createdAt: new Date().toISOString(),
    archived: false
  };
  state.habits.push(habit);
  saveState();
  renderAll();
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

  const activeHabits = getActiveHabits();

  if (activeHabits.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <span class="empty-state-icon">🎯</span>
        <h3>还没有习惯</h3>
        <p>点击"+ 添加习惯"开始吧！</p>
        <div class="example-habits">
          ${EXAMPLE_HABITS.map(ex => `
            <button class="example-habit-btn" onclick="addExampleHabit('${ex.name}','${ex.desc}','${ex.color}')">
              + ${ex.name}
            </button>
          `).join('')}
        </div>
      </div>`;
    return;
  }

  list.innerHTML = activeHabits.map(habit => {
    const streak = getStreak(habit.id);
    const last30 = getLast30Days(habit.id);
    const streakClass = streak > 0 ? '' : 'streak-zero';

    // Milestone class for streak days
    const milestoneClass = streak >= 100 ? 'milestone-100' : streak >= 66 ? 'milestone-66' : streak >= 21 ? 'milestone-21' : streak >= 7 ? 'milestone-7' : '';
    const milestoneBadge = streak >= 7 ? MILESTONES.find(m => m.days === streak || (streak >= m.days && (MILESTONES[MILESTONES.findIndex(x=>x.days===m.days)+1]?.days > streak || !MILESTONES[MILESTONES.findIndex(x=>x.days===m.days)+1]))) : null;
    // Show badge only on exact milestone
    const exactMilestone = MILESTONES.find(m => m.days === streak);

    return `
      <div class="habit-card" data-habit="${habit.id}" style="--habit-color:${habit.color || 'var(--accent)'}">
        <div class="habit-card-header">
          <div class="habit-title-row">
            <div class="habit-dot" style="background:${habit.color || '#f97316'}"></div>
            <div>
              <div class="habit-name">${habit.name}</div>
              ${habit.desc ? `<div class="habit-desc">${habit.desc}</div>` : ''}
            </div>
          </div>
          <div class="habit-actions">
            ${exactMilestone ? `<span class="milestone-badge milestone-${streak}">${exactMilestone.icon}</span>` : ''}
            <span class="streak-badge ${streakClass}">🔥 ${streak} 天</span>
            <button class="btn-archive" onclick="archiveHabit('${habit.id}')" title="归档习惯">📦</button>
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
            ${last30.map((day, idx) => {
              let dayClass = 'streak-day';
              if (day.completed) dayClass += ' completed';
              if (day.isToday) dayClass += ' today';
              // Check if this day is a milestone day for the overall streak
              const daysFromEnd = 29 - idx;
              if (day.completed && streak > 0 && (streak - daysFromEnd) > 0) {
                const streakOnDay = streak - daysFromEnd;
                if (streakOnDay === 7) dayClass += ' milestone-7';
                else if (streakOnDay === 21) dayClass += ' milestone-21';
                else if (streakOnDay === 66) dayClass += ' milestone-66';
                else if (streakOnDay === 100) dayClass += ' milestone-100';
              }
              return `<div class="${dayClass}" title="${day.date}${day.completed ? ' ✓' : ''}"></div>`;
            }).join('')}
          </div>
        </div>
      </div>`;
  }).join('');
}

// ─── 渲染：归档区域 ───────────────────────────────────────────────────────
function renderArchivedSection() {
  const section = document.getElementById('archivedSection');
  const list = document.getElementById('archivedList');
  if (!section || !list) return;

  const archived = getArchivedHabits();
  if (archived.length === 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';

  list.innerHTML = archived.map(habit => `
    <div class="habit-card archived" data-habit="${habit.id}" style="--habit-color:${habit.color || 'var(--accent)'}">
      <div class="habit-card-header">
        <div class="habit-title-row">
          <div class="habit-dot" style="background:${habit.color || '#f97316'};opacity:0.5"></div>
          <div>
            <div class="habit-name" style="opacity:0.7">${habit.name}</div>
            ${habit.desc ? `<div class="habit-desc">${habit.desc}</div>` : ''}
          </div>
        </div>
        <div class="habit-actions">
          <button class="btn-unarchive" onclick="unarchiveHabit('${habit.id}')">↩️ 恢复</button>
          <button class="btn-delete" onclick="deleteHabit('${habit.id}')">🗑️</button>
        </div>
      </div>
    </div>
  `).join('');
}

// ─── 归档 / 恢复 ───────────────────────────────────────────────────────────
function archiveHabit(habitId) {
  const habit = state.habits.find(h => h.id === habitId);
  if (habit) {
    habit.archived = true;
    saveState();
    renderAll();
  }
}

function unarchiveHabit(habitId) {
  const habit = state.habits.find(h => h.id === habitId);
  if (habit) {
    habit.archived = false;
    saveState();
    renderAll();
  }
}

// ─── 切换完成状态 ───────────────────────────────────────────────────────
function toggleHabit(habitId) {
  const d = today();
  if (!state.completions[d]) state.completions[d] = [];
  const idx = state.completions[d].indexOf(habitId);
  const wasCompleted = idx >= 0;

  if (wasCompleted) {
    state.completions[d].splice(idx, 1);
  } else {
    state.completions[d].push(habitId);
    // Check for milestone
    const newStreak = getStreak(habitId);
    if (MILESTONES.some(m => m.days === newStreak)) {
      celebrateMilestone(newStreak);
    }
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
  if (id === 'habitModal') {
    rotateHabitTip();
  }
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

// ─── 归档区域折叠 ─────────────────────────────────────────────────────────
let archivedExpanded = false;
function toggleArchived() {
  const list = document.getElementById('archivedList');
  const btn = document.getElementById('toggleArchivedBtn');
  if (!list) return;
  archivedExpanded = !archivedExpanded;
  list.style.display = archivedExpanded ? 'flex' : 'none';
  if (btn) btn.textContent = archivedExpanded ? '收起' : '展开';
}

// ─── 事件监听 ─────────────────────────────────────────────────────────
// ─── Toast 通知 ───────────────────────────────────────────────────────────────
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// ─── 数据导出 ────────────────────────────────────────────────────────────────
function exportData() {
  const NS = 'atomic_habits_';
  const backup = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(NS)) {
      try {
        backup[key] = JSON.parse(localStorage.getItem(key));
      } catch {
        backup[key] = localStorage.getItem(key);
      }
    }
  }
  if (Object.keys(backup).length === 0) {
    showToast('没有可导出的数据', 'error');
    return;
  }
  backup._meta = {
    app: 'atomic-habits-tracker',
    version: '2.0',
    exportedAt: new Date().toISOString()
  };
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `atomic-habits-backup-${date}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('数据导出成功！', 'success');
}

// ─── 数据导入 ────────────────────────────────────────────────────────────────
function importData(file) {
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      // Validate required structure
      if (!data._meta || !data._meta.app !== 'atomic-habits-tracker') {
        showToast('无效的备份文件格式', 'error');
        return;
      }
      if (!confirm('导入将覆盖现有数据，确定继续？')) return;
      // Clear existing atomic_habits_ keys
      const NS = 'atomic_habits_';
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(NS)) keysToRemove.push(key);
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
      // Write imported data (skip _meta)
      for (const [key, value] of Object.entries(data)) {
        if (key === '_meta') continue;
        localStorage.setItem(key, JSON.stringify(value));
      }
      // Reload state and re-render
      loadState();
      renderAll();
      showToast('数据导入成功！页面已刷新。', 'success');
    } catch (err) {
      showToast('导入失败：文件格式错误', 'error');
      console.warn('Import error:', err);
    }
  };
  reader.onerror = function() {
    showToast('读取文件失败', 'error');
  };
  reader.readAsText(file);
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
  document.getElementById('toggleArchivedBtn')?.addEventListener('click', toggleArchived);

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
    const name = document.getElementByById('habitName').value.trim();
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
      createdAt: new Date().toISOString(),
      archived: false
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

  // 每日反思保存
  document.getElementById('saveReflectionBtn')?.addEventListener('click', saveReflection);

  // 键盘快捷键
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAllModals();
  });

  // 导出数据按钮
  document.getElementById('exportDataBtn')?.addEventListener('click', exportData);

  // 导入数据按钮
  document.getElementById('importDataBtn')?.addEventListener('click', () => {
    document.getElementById('importFileInput')?.click();
  });

  // 隐藏的文件输入 - 选择文件后触发导入
  document.getElementById('importFileInput')?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) {
      importData(file);
      e.target.value = ''; // Reset so same file can be re-selected
    }
  });
}

// ─── 启动 ────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
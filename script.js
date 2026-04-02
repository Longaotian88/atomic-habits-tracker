/* =====================
   原子习惯追踪器 - JS (增强版)
   ===================== */

// ─── 状态 ────────────────────────────────────────────────────────────────────
let state = {
  habits: [],       // { id, name, desc, target, color, cue, craving, response, reward, createdAt, archived, customFreq, linkedIdentityId, linkedStackId }
  completions: {},  // { 'YYYY-MM-DD': [habitId, ...] }
  identities: [],   // { id, text, why }
  stacks: []        // { id, anchor, newHabit, cue, habitId, identityId }
};

const LS_KEY = 'atomic_habits_v2';
const REFLECTION_KEY = 'atomic_habits_reflection_v2';

// Motivational quotes
const MOTIVATIONAL_QUOTES = [
  { quote: "习惯是自我改善的复利。每天进步1%，一年后将提升37倍。", author: "詹姆斯·克利尔" },
  { quote: "你应该是更关心你现在的轨迹，而不是你现在的结果。", author: "詹姆斯·克利尔" },
  { quote: "习惯的养成不在于时间的长短，而在于重复的次数。", author: "BJ·福格" },
  { quote: "成功的反面不是失败，而是从未尝试。", author: "西奥多·罗斯福" },
  { quote: "不要等到明天，明天未必会来。现在就开始。", author: "非洲谚语" },
  { quote: "你不需要很厉害才开始，你需要开始才会很厉害。", author: "匿名" },
  { quote: "每一个大习惯都是由无数个小习惯组成的。", author: "原子习惯" },
  { quote: "让好习惯显而易见，让坏习惯看不见。", author: "詹姆斯·克利尔" }
];

// Example habits for empty state
const QUICK_EXAMPLE_HABITS = [
  { name: '阅读1页', cue: '睡前', tinyAction: '读1页', color: '#3b82f6' },
  { name: '写1句话', cue: '起床后', tinyAction: '写1句话', color: '#8b5cf6' },
  { name: '走路5分钟', cue: '下班后', tinyAction: '走5分钟', color: '#10b981' }
];

// Milestone data
const MILESTONES = [
  { days: 7, icon: '🎖️', label: '7天里程碑', sub: '初步习惯已形成，继续加油！' },
  { days: 21, icon: '🏅', label: '21天里程碑', sub: '21天养成习惯，你做到了！' },
  { days: 66, icon: '🏆', label: '66天里程碑', sub: '66天 = 真正的习惯养成！' },
  { days: 100, icon: '👑', label: '100天里程碑', sub: '百日坚持，卓越非凡！' }
];

// Reflection questions
const REFLECTION_QUESTIONS = {
  good: [
    "是什么让今天这么顺利？",
    "哪个习惯最容易完成？",
    "明天如何保持这个好状态？"
  ],
  hard: [
    "哪里遇到了阻力？",
    "是什么打断了你的习惯？",
    "明天可以怎么调整？"
  ]
};

// Habit tips pool
const HABIT_TIPS = [
  '先写\'什么时候开始\'，再写\'做到什么算完成\'，这样最容易坚持。',
  '从极小的行为开始（1个俯卧撑！），让阻力接近零。',
  '给每个习惯完成后立即庆祝，大脑会记住这个快乐的关联！',
  '把手机放到另一个房间，减少干扰，提升专注力。',
  '习惯堆叠 = "在 [旧习惯] 之后，我将 [新习惯]"，利用已有习惯带动新习惯。',
  '睡前把第二天要用的东西（运动服、书本）准备好，减少启动阻力。',
  '让好习惯显而易见——把跑鞋放在门口，把书放在枕头边。',
  '连续做7天就会形成初步习惯，别打断链条！🔥',
  '每晚睡前回顾：今天哪个习惯做得最好？明天如何改进？'
];

// ─── 初始化 ────────────────────────────────────────────────────────────────────
function init() {
  loadState();
  renderAll();
  animateCompoundBars();
  setupEventListeners();
  updateTodayDate();
  loadReflection();
  renderQuotes();
}

function renderQuotes() {
  const grid = document.getElementById('quotesGrid');
  if (!grid) return;
  // Shuffle and pick 4
  const shuffled = [...MOTIVATIONAL_QUOTES].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, 4);
  grid.innerHTML = selected.map(q => `
    <div class="quote-card">
      <p>${q.quote}</p>
      <div class="quote-author">— ${q.author}</div>
    </div>
  `).join('');
}

// ─── 存储 ─────────────────────────────────────────────────────────────────
function loadState() {
  try {
    const saved = localStorage.getItem(LS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
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

// ─── 每日反思 v2 ──────────────────────────────────────────────────────────
function loadReflection() {
  const key = REFLECTION_KEY + '_' + today();
  const saved = localStorage.getItem(key);
  const savedEl = document.getElementById('reflectionSaved');
  if (saved) {
    try {
      const data = JSON.parse(saved);
      if (data.mood) {
        const d = document.querySelector('#moodRating .rating-dot[data-val="' + data.mood + '"]');
        if (d) d.classList.add('selected');
      }
      if (data.energy) {
        const d = document.querySelector('#energyRating .rating-dot[data-val="' + data.energy + '"]');
        if (d) d.classList.add('selected');
      }
      if (data.obstacles && Array.isArray(data.obstacles)) {
        data.obstacles.forEach(obs => {
          const c = document.querySelector('#obstacleChips .chip-sm[data-val="' + obs + '"]');
          if (c) c.classList.add('selected');
        });
      }
      const t = document.getElementById('reflectionText');
      if (t && data.text) t.value = data.text;
      if (savedEl) savedEl.textContent = '✓ 已保存';
    } catch(e) {}
  }
}

function saveReflection() {
  const mood = document.querySelector('#moodRating .rating-dot.selected')?.dataset.val || 0;
  const energy = document.querySelector('#energyRating .rating-dot.selected')?.dataset.val || 0;
  const obstacles = Array.from(document.querySelectorAll('#obstacleChips .chip-sm.selected')).map(c => c.dataset.val);
  const text = document.getElementById('reflectionText')?.value.trim() || '';
  const savedEl = document.getElementById('reflectionSaved');
  const data = { mood, energy, obstacles, text, savedAt: new Date().toISOString() };
  localStorage.setItem(REFLECTION_KEY + '_' + today(), JSON.stringify(data));
  if (savedEl) { savedEl.textContent = '✓ 已保存'; setTimeout(() => { if (savedEl) savedEl.textContent = ''; }, 2000); }
}

document.addEventListener('click', function(e) {
  const dot = e.target.closest('.rating-dot');
  if (dot && dot.closest('.reflect-rating')) {
    dot.closest('.reflect-rating').querySelectorAll('.rating-dot').forEach(d => d.classList.remove('selected'));
    dot.classList.add('selected');
    saveReflection();
  }
  const chip = e.target.closest('.obstacle-chips .chip-sm');
  if (chip) { chip.classList.toggle('selected'); saveReflection(); }
});

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
  let bestCount = 0;
  getActiveHabits().forEach(h => {
    const count = habitCounts[h.id] || 0;
    if (count > bestCount) {
      bestCount = count;
      best = h;
    }
  });
  // Need at least 3 completions this month to show
  if (bestCount < 3) return null;
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
    const circumference = 2 * Math.PI * 52;
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
      fullWeek.push({ dateStr, label: dayLabels[i-1], pct, isToday });
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
    if (!bestHabit) {
      bestEl.innerHTML = `<div class="best-habit-empty">连续完成3次后，这里会显示你的本月最佳习惯</div>`;
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
  if (habitsList && habitsList.parentNode) {
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
  populateStackModalSelects();
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
        <h3>还没有任何习惯</h3>
        <p class="empty-state-sub">先添加一个2分钟内能完成的小习惯</p>
        <div class="example-habits">
          ${QUICK_EXAMPLE_HABITS.map(ex => `
            <button class="example-habit-btn" onclick="addQuickHabit('${ex.name}','${ex.cue}','${ex.tinyAction}','${ex.color}')">
              ${ex.name}
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
function addQuickHabit(name, cue, tinyAction, color) {
  const habit = {
    id: generateId(),
    name,
    cue,
    tinyAction,
    target: 7,
    color,
    craving: '', response: tinyAction, reward: '',
    createdAt: new Date().toISOString(),
    archived: false,
    customFreq: ''
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
        <p class="empty-state-sub">点击"+ 添加习惯"开始吧！</p>
        <div class="example-habits">
          ${QUICK_EXAMPLE_HABITS.map(ex => `
            <button class="example-habit-btn" onclick="addQuickHabit('${ex.name}','${ex.cue}','${ex.tinyAction}','${ex.color}')">
              ${ex.name}
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

    // Find linked identity
    const linkedIdentity = habit.linkedIdentityId
      ? state.identities.find(i => i.id === habit.linkedIdentityId)
      : null;

    // Find linked stack
    const linkedStack = habit.linkedStackId
      ? state.stacks.find(s => s.id === habit.linkedStackId)
      : null;

    // Also find stacks that reference this habit's cue as anchor
    const stacksForThisHabit = state.stacks.filter(s => {
      return s.habitId === habit.id ||
             (s.anchor === habit.cue && !s.habitId);
    });

    // Find identity text from habit name or cue if there's a matching pattern
    // Show inline meta tags
    const metaTags = [];
    if (linkedStack) {
      metaTags.push(`<span class="habit-meta-tag"><span class="tag-icon">📌</span> ${linkedStack.anchor} → ${habit.tinyAction || habit.name}</span>`);
    } else if (habit.cue && habit.tinyAction) {
      metaTags.push(`<span class="habit-meta-tag"><span class="tag-icon">📌</span> ${habit.cue} → ${habit.tinyAction}</span>`);
    }
    if (linkedIdentity) {
      metaTags.push(`<span class="habit-meta-tag"><span class="tag-icon">🪪</span> ${linkedIdentity.text}</span>`);
    }

    // Milestone for exact streak
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

        ${metaTags.length > 0 ? `<div class="habit-card-meta">${metaTags.join('')}</div>` : ''}

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

        <!-- Optimize habit link (always visible, expands inline loop fields) -->
        <button class="optimize-link" id="optimizeLink_${habit.id}" onclick="toggleOptimizeLink('${habit.id}')">
          ✨ 优化这个习惯 <span class="optimize-link__arrow">▶</span>
        </button>

        <!-- Inline loop expand (hidden by default) -->
        <div class="loop-expand" id="loopExpand_${habit.id}">
          <div class="loop-expand-grid">
            <div class="loop-expand-field">
              <label>提示（触发）</label>
              <input type="text" id="expandCue_${habit.id}" value="${habit.cue || ''}" placeholder="什么触发了这个习惯？">
            </div>
            <div class="loop-expand-field">
              <label>渴望（动机）</label>
              <input type="text" id="expandCraving_${habit.id}" value="${habit.craving || ''}" placeholder="你渴望什么？">
            </div>
            <div class="loop-expand-field">
              <label>反应（行动）</label>
              <input type="text" id="expandResponse_${habit.id}" value="${habit.response || ''}" placeholder="你实际上做什么？">
            </div>
            <div class="loop-expand-field">
              <label>即时奖励</label>
              <input type="text" id="expandReward_${habit.id}" value="${habit.reward || ''}" placeholder="完成后立刻感受到什么？">
            </div>
          </div>
          <div style="margin-top:10px;display:flex;justify-content:flex-end;gap:8px">
            <button class="btn btn-secondary btn-sm" onclick="cancelOptimizeLink('${habit.id}')">取消</button>
            <button class="btn btn-primary btn-sm" onclick="saveOptimizeLink('${habit.id}')">保存</button>
          </div>
        </div>

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

// ─── Toggle Optimize Link (inline habit loop editing) ────────────────────
function toggleOptimizeLink(habitId) {
  const expandEl = document.getElementById('loopExpand_' + habitId);
  const linkEl = document.getElementById('optimizeLink_' + habitId);
  if (!expandEl) return;

  const isOpen = expandEl.classList.contains('open');
  expandEl.classList.toggle('open');
  if (linkEl) linkEl.classList.toggle('open', !isOpen);
}

function cancelOptimizeLink(habitId) {
  const expandEl = document.getElementById('loopExpand_' + habitId);
  const linkEl = document.getElementById('optimizeLink_' + habitId);
  if (expandEl) expandEl.classList.remove('open');
  if (linkEl) linkEl.classList.remove('open');
}


function saveOptimizeLink(habitId) {
  const habit = state.habits.find(h => h.id === habitId);
  if (!habit) return;

  habit.craving = document.getElementById('expandCraving_' + habitId)?.value.trim() || '';
  habit.response = document.getElementById('expandResponse_' + habitId)?.value.trim() || '';
  habit.reward = document.getElementById('expandReward_' + habitId)?.value.trim() || '';

  saveState();
  cancelOptimizeLink(habitId);
  renderHabits();
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
  renderHabits();
}

// ─── 删除堆叠 ───────────────────────────────────────────────────────────
function deleteStack(id) {
  state.stacks = state.stacks.filter(s => s.id !== id);
  saveState();
  renderStacks();
  renderHabits();
}

// ─── 弹窗 ───────────────────────────────────────────────────────
function openModal(id) {
  document.getElementById(id)?.classList.add('open');
  if (id === 'habitModal') {
    const advSection = document.getElementById('advancedSection');
    const advToggle = document.getElementById('advancedToggle');
    const advToggleText = document.getElementById('advancedToggleText');
    const advToggleArrow = document.getElementById('advancedToggleArrow');
    if (advSection) advSection.classList.remove('open');
    if (advToggle) advToggle.classList.remove('open');
    if (advToggleText) advToggleText.textContent = '展开高级设置';
    if (advToggleArrow) advToggleArrow.textContent = '▼';
    updateHabitPreview();
    document.querySelectorAll('#habitModal .chip').forEach(c => c.classList.remove('selected'));
    const customFreqGroup = document.getElementById('customFreqGroup');
    if (customFreqGroup) customFreqGroup.style.display = 'none';
  }
}
function closeModal(id) {
  document.getElementById(id)?.classList.remove('open');
}

function closeAllModals() {
  document.querySelectorAll('.modal').forEach(m => m.classList.remove('open'));
}

function openLoopModal(habitId) {
  const habit = state.habits.find(h => h.id === habitId);
  if (!habit) return;
  document.getElementById('loopHabitId').value = habitId;
  document.getElementById('loopCue').value = habit.cue || '';
  document.getElementById('loopCraving').value = habit.craving || '';
  document.getElementById('loopResponse').value = habit.response || '';
  document.getElementById('loopReward').value = habit.reward || '';
  document.getElementById('loopModalTitle').textContent = '编辑习惯循环：' + habit.name;
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

// ─── 方法工具箱折叠 ─────────────────────────────────────────────────────
let toolboxOpen = false;
function toggleToolbox() {
  const content = document.getElementById('toolboxContent');
  const toggle = document.getElementById('toolboxToggle');
  const toggleText = document.getElementById('toolboxToggleText');
  const toggleArrow = document.getElementById('toolboxToggleArrow');
  toolboxOpen = !toolboxOpen;
  if (content) content.style.display = toolboxOpen ? 'block' : 'none';
  if (toggle) toggle.classList.toggle('open', toolboxOpen);
  if (toggleText) toggleText.textContent = toolboxOpen ? '收起方法工具箱' : '展开方法工具箱';
  if (toggleArrow) toggleArrow.textContent = toolboxOpen ? '▲' : '▼';
}

// ─── Populate stack modal selects ─────────────────────────────────────
function populateStackModalSelects() {
  const habitSelect = document.getElementById('stackHabitId');
  const identitySelect = document.getElementById('stackIdentityId');
  if (!habitSelect || !identitySelect) return;
  const habitOptions = getActiveHabits().map(h =>
    '<option value="' + h.id + '">' + h.name + '</option>'
  ).join('');
  const identityOptions = state.identities.map(i =>
    '<option value="' + i.id + '">' + i.text + '</option>'
  ).join('');
  habitSelect.innerHTML = '<option value="">（不关联）</option>' + habitOptions;
  identitySelect.innerHTML = '<option value="">（不关联）</option>' + identityOptions;
}

// ─── Toast ────────────────────────────────────────────────────────────────
function showToast(message, type) {
  type = type || 'info';
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = 'toast ' + type + ' show';
  clearTimeout(toast._timer);
  toast._timer = setTimeout(function() {
    toast.classList.remove('show');
  }, 3000);
}

// ─── 数据导出 ────────────────────────────────────────────────────────────────
function exportData() {
  var NS = 'atomic_habits_';
  var backup = {};
  for (var i = 0; i < localStorage.length; i++) {
    var key = localStorage.key(i);
    if (key && key.startsWith(NS)) {
      try {
        backup[key] = JSON.parse(localStorage.getItem(key));
      } catch (e) {
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
  var json = JSON.stringify(backup, null, 2);
  var blob = new Blob([json], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  var date = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = 'atomic-habits-backup-' + date + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('数据导出成功！', 'success');
}

// ─── 数据导入 ────────────────────────────────────────────────────────────────
function importData(file) {
  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var data = JSON.parse(e.target.result);
      if (!data._meta || !data._meta.app === 'atomic-habits-tracker') {
        showToast('无效的备份文件格式', 'error');
        return;
      }
      if (!confirm('导入将覆盖现有数据，确定继续？')) return;
      var NS = 'atomic_habits_';
      var keysToRemove = [];
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (key && key.startsWith(NS)) keysToRemove.push(key);
      }
      keysToRemove.forEach(function(k) { localStorage.removeItem(k); });
      for (var key in data) {
        if (key === '_meta') continue;
        localStorage.setItem(key, JSON.stringify(data[key]));
      }
      loadState();
      renderAll();
      showToast('数据导入成功！页面已刷新。', 'success');
    } catch (err) {
      showToast('导入失败：文件格式错误', 'error');
    }
  };
  reader.onerror = function() {
    showToast('读取文件失败', 'error');
  };
  reader.readAsText(file);
}

// ─── 事件监听 ─────────────────────────────────────────────────────────
function setupEventListeners() {
  // 深色模式
  var darkToggle = document.getElementById('darkModeToggle');
  if (darkToggle) {
    darkToggle.addEventListener('click', function() {
      var html = document.documentElement;
      var current = html.getAttribute('data-theme');
      var next = current === 'dark' ? 'light' : 'dark';
      html.setAttribute('data-theme', next);
      darkToggle.textContent = next === 'dark' ? '☀️' : '🌙';
      darkToggle.title = next === 'dark' ? '切换浅色模式' : '切换深色模式';
      localStorage.setItem('theme', next);
    });
  }

  var savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
    var dmBtn = document.getElementById('darkModeToggle');
    if (dmBtn) {
      dmBtn.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
      dmBtn.title = savedTheme === 'dark' ? '切换浅色模式' : '切换深色模式';
    }
  }

  // 按钮事件
  var addBtn = document.getElementById('addHabitBtn');
  if (addBtn) addBtn.addEventListener('click', function() { openModal('habitModal');
      populateHabitModalDropdowns(); });
  var addIdBtn = document.getElementById('addIdentityBtn');
  if (addIdBtn) addIdBtn.addEventListener('click', function() { openModal('identityModal'); });
  var addStkBtn = document.getElementById('addStackBtn');
  if (addStkBtn) addStkBtn.addEventListener('click', function() { openModal('stackModal'); });
  var toggleArchBtn = document.getElementById('toggleArchivedBtn');
  if (toggleArchBtn) toggleArchBtn.addEventListener('click', toggleArchived);
  var toolboxTgl = document.getElementById('toolboxToggle');
  if (toolboxTgl) toolboxTgl.addEventListener('click', toggleToolbox);

  // 弹窗关闭
  document.querySelectorAll('.modal-backdrop').forEach(function(el) {
    el.addEventListener('click', closeAllModals);
  });
  document.querySelectorAll('.modal-close').forEach(function(el) {
    el.addEventListener('click', closeAllModals);
  });

  // 颜色选择器
  document.querySelectorAll('.color-dot').forEach(function(dot) {
    dot.addEventListener('click', function() {
      document.querySelectorAll('.color-dot').forEach(function(d) { d.classList.remove('active'); });
      dot.classList.add('active');
    });
  });

  // 高级设置
  var advToggle = document.getElementById('advancedToggle');
  if (advToggle) {
    advToggle.addEventListener('click', function() {
      var advSection = document.getElementById('advancedSection');
      var advToggleText = document.getElementById('advancedToggleText');
      var advToggleArrow = document.getElementById('advancedToggleArrow');
      var isOpen = advSection && advSection.classList.contains('open');
      if (advSection) advSection.classList.toggle('open');
      advToggle.classList.toggle('open');
      if (advToggleText) advToggleText.textContent = isOpen ? '展开高级设置' : '收起高级设置';
      if (advToggleArrow) advToggleArrow.textContent = isOpen ? '▼' : '▲';
    });
  }

  // 自定义频率
  var habitTarget = document.getElementById('habitTarget');
  if (habitTarget) {
    habitTarget.addEventListener('change', function() {
      var customFreqGroup = document.getElementById('customFreqGroup');
      if (habitTarget.value === 'custom') {
        if (customFreqGroup) customFreqGroup.style.display = 'block';
      } else {
        if (customFreqGroup) customFreqGroup.style.display = 'none';
      }
    });
  }

  // 预设芯片
  document.querySelectorAll('.chip').forEach(function(chip) {
    chip.addEventListener('click', function() {
      var parent = chip.closest('.form-group');
      var chipsContainer = parent && parent.querySelector('.preset-chips');
      var input = parent && parent.querySelector('input[type="text"]');
      var chipVal = chip.dataset.val;
      if (chipsContainer) {
        var wasSelected = chip.classList.contains('selected');
        chipsContainer.querySelectorAll('.chip').forEach(function(c) { c.classList.remove('selected'); });
        if (!wasSelected) {
          chip.classList.add('selected');
          if (input) input.value = chipVal;
        } else {
          if (input) input.value = '';
        }
      }
      updateHabitPreview();
    });
  });

  // 习惯预览
  function updateHabitPreview() {
    var name = (document.getElementById('habitName') || {}).value || '';
    var cue = (document.getElementById('habitCue') || {}).value || '';
    var tinyAction = (document.getElementById('habitTinyAction') || {}).value || '';
    var preview = document.getElementById('habitPreview');
    var previewText = document.getElementById('habitPreviewText');
    if (!preview || !previewText) return;
    name = name.trim();
    cue = cue.trim();
    tinyAction = tinyAction.trim();
    if (name && cue && tinyAction) {
      previewText.textContent = '在我' + cue + '后，我会' + tinyAction + '。';
      preview.classList.add('visible');
    } else if (name && cue) {
      previewText.textContent = '在我' + cue + '后，我会……';
      preview.classList.add('visible');
    } else if (name && tinyAction) {
      previewText.textContent = name + ' → ' + tinyAction;
      preview.classList.add('visible');
    } else {
      preview.classList.remove('visible');
    }
  }
  ['habitName', 'habitCue', 'habitTinyAction'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('input', updateHabitPreview);
  });

  // 快速反思按钮
  var reflGoodBtn = document.getElementById('reflectGoodBtn');
  if (reflGoodBtn) reflGoodBtn.addEventListener('click', function() { handleReflectionClick('good'); });
  var reflHardBtn = document.getElementById('reflectHardBtn');
  if (reflHardBtn) reflHardBtn.addEventListener('click', function() { handleReflectionClick('hard'); });

  // 得分卡点击
  var scorecardGrid = document.getElementById('scorecardGrid');
  if (scorecardGrid) {
    scorecardGrid.addEventListener('click', function(e) {
      var check = e.target.closest('.scorecard-check');
      if (check) toggleHabit(check.dataset.habit);
    });
  }

  // 习惯表单
  var habitForm = document.getElementById('habitForm');
  if (habitForm) {
    habitForm.addEventListener('submit', function(e) {
      e.preventDefault();
      var name = (document.getElementById('habitName') || {}).value.trim();
      if (!name) return;
      var activeColor = document.querySelector('.color-dot.active');
      var targetVal = (document.getElementById('habitTarget') || {}).value || '7';
      var customFreq = targetVal === 'custom'
        ? ((document.getElementById('customFreqInput') || {}).value || '').trim()
        : '';
      var habit = {
        id: generateId(),
        name: name,
        desc: ((document.getElementById('habitDesc') || {}).value || '').trim(),
        target: targetVal === 'custom' ? 7 : parseInt(targetVal),
        color: (activeColor && activeColor.dataset.color) || '#f97316',
        cue: ((document.getElementById('habitCue') || {}).value || '').trim(),
        craving: ((document.getElementById('habitMotivation') || {}).value || '').trim(),
        response: ((document.getElementById('habitTinyAction') || {}).value || '').trim(),
        reward: ((document.getElementById('habitInstantReward') || {}).value || '').trim(),
        createdAt: new Date().toISOString(),
        archived: false,
        customFreq: customFreq,
        tinyAction: ((document.getElementById('habitTinyAction') || {}).value || '').trim(),
        linkedIdentityId: (document.getElementById('habitIdentitySelect') || {}).value || '',
        linkedStackId: (document.getElementById('habitStackSelect') || {}).value || ''
      };
      state.habits.push(habit);
      saveState();
      habitForm.reset();
      document.querySelectorAll('.color-dot').forEach(function(d) { d.classList.remove('active'); });
      var orangeDot = document.querySelector('.color-dot[data-color="#f97316"]');
      if (orangeDot) orangeDot.classList.add('active');
      var advSection = document.getElementById('advancedSection');
      var advToggleEl = document.getElementById('advancedToggle');
      var advToggleText = document.getElementById('advancedToggleText');
      var advToggleArrow = document.getElementById('advancedToggleArrow');
      if (advSection) advSection.classList.remove('open');
      if (advToggleEl) advToggleEl.classList.remove('open');
      if (advToggleText) advToggleText.textContent = '展开高级设置';
      if (advToggleArrow) advToggleArrow.textContent = '▼';
      document.querySelectorAll('#habitModal .chip').forEach(function(c) { c.classList.remove('selected'); });
      var customFreqGroup = document.getElementById('customFreqGroup');
      if (customFreqGroup) customFreqGroup.style.display = 'none';
      closeModal('habitModal');
      renderAll();
    });
  }

  // 身份表单
  var identityForm = document.getElementById('identityForm');
  if (identityForm) {
    identityForm.addEventListener('submit', function(e) {
      e.preventDefault();
      var text = (document.getElementById('identityText') || {}).value.trim();
      if (!text) return;
      state.identities.push({
        id: generateId(),
        text: text,
        why: ((document.getElementById('identityWhy') || {}).value || '').trim()
      });
      saveState();
      identityForm.reset();
      closeModal('identityModal');
      renderAll();
    });
  }

  // 堆叠表单
  var stackForm = document.getElementById('stackForm');
  if (stackForm) {
    stackForm.addEventListener('submit', function(e) {
      e.preventDefault();
      var anchor = (document.getElementById('stackAnchor') || {}).value.trim();
      var newHabit = (document.getElementById('stackNew') || {}).value.trim();
      if (!anchor || !newHabit) return;
      var stack = {
        id: generateId(),
        anchor: anchor,
        newHabit: newHabit,
        cue: ((document.getElementById('stackCue') || {}).value || '').trim(),
        habitId: (document.getElementById('stackHabitId') || {}).value || '',
        identityId: (document.getElementById('stackIdentityId') || {}).value || ''
      };
      state.stacks.push(stack);
      if (stack.habitId) {
        var habit = state.habits.find(function(h) { return h.id === stack.habitId; });
        if (habit) habit.linkedStackId = stack.id;
      }
      if (stack.identityId) {
        state.habits.forEach(function(h) {
          if (h.linkedStackId === stack.id) h.linkedIdentityId = stack.identityId;
        });
      }
      saveState();
      stackForm.reset();
      closeModal('stackModal');
      renderAll();
    });
  }

  // 循环表单
  var loopForm = document.getElementById('loopForm');
  if (loopForm) {
    loopForm.addEventListener('submit', function(e) {
      e.preventDefault();
      var habitId = (document.getElementById('loopHabitId') || {}).value;
      var habit = state.habits.find(function(h) { return h.id === habitId; });
      if (!habit) return;
      habit.cue = ((document.getElementById('loopCue') || {}).value || '').trim();
      habit.craving = ((document.getElementById('loopCraving') || {}).value || '').trim();
      habit.response = ((document.getElementById('loopResponse') || {}).value || '').trim();
      habit.reward = ((document.getElementById('loopReward') || {}).value || '').trim();
      saveState();
      closeModal('loopModal');
      renderHabits();
    });
  }

  // 反思保存
  var saveReflBtn = document.getElementById('saveReflectionBtn');
  if (saveReflBtn) saveReflBtn.addEventListener('click', saveReflection);

  // 键盘
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeAllModals();
  });

  // 导出
  var exportBtn = document.getElementById('exportDataBtn');
  if (exportBtn) exportBtn.addEventListener('click', exportData);

  // 导入
  var importBtn = document.getElementById('importDataBtn');
  if (importBtn) importBtn.addEventListener('click', function() {
    var fileInput = document.getElementById('importFileInput');
    if (fileInput) fileInput.click();
  });

  var importFileInput = document.getElementById('importFileInput');
  if (importFileInput) {
    importFileInput.addEventListener('change', function(e) {
      var file = (e.target.files || [])[0];
      if (file) {
        importData(file);
        e.target.value = '';
      }
    });
  }
}

// ─── 启动 ────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);

// Atomic Habits Tracker v5
'use strict';

var HABIT_KEY = 'atomic_habits_v2';
var REFLECTION_KEY = 'ah_reflection_v3';
var MILESTONES = [
  { days: 3, icon: '🌱', label: '3天', sub: '好的开始！继续加油！' },
  { days: 7, icon: '🔥', label: '7天', sub: '一周连续！习惯在形成！' },
  { days: 21, icon: '⚡', label: '21天', sub: '三周！身体开始记住它！' },
  { days: 30, icon: '🏆', label: '30天', sub: '一个月！真正的里程碑！' },
  { days: 66, icon: '💎', label: '66天', sub: '两个月！身份在改变！' },
  { days: 100, icon: '🚀', label: '100天', sub: '百日！你是榜样！' },
  { days: 365, icon: '👑', label: '365天', sub: '一年！传奇！' },
];
var QUICK_EXAMPLES = [
  { name: '读书', cue: '睡前', tinyAction: '读1页', color: '#3b82f6' },
  { name: '俯卧撑', cue: '起床后', tinyAction: '做1个俯卧撑', color: '#f97316' },
  { name: '走路', cue: '下班后', tinyAction: '走5分钟', color: '#10b981' },
];

var state = { habits: [], completions: {}, identities: [], stacks: [], settings: {} };

function today() {
  var d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}
function generateId() { return 'h_' + Date.now() + '_' + Math.random().toString(36).substr(2,6); }
function getActiveHabits() { return state.habits.filter(function(h) { return !h.archived; }); }
function isCompleted(id) { return (state.completions[today()] || []).indexOf(id) >= 0; }

function getStreak(id) {
  var days = 0, date = new Date();
  for (var i = 0; i < 365; i++) {
    var k = date.toISOString().slice(0,10);
    if ((state.completions[k] || []).indexOf(id) >= 0) { days++; date.setDate(date.getDate()-1); }
    else break;
  }
  return days;
}

function getThisWeekDays() {
  var now = new Date(), dow = now.getDay() || 7, days = [];
  for (var i = 1; i <= 7; i++) {
    var d = new Date(now); d.setDate(d.getDate() - (dow - i));
    days.push({ dateStr: d.toISOString().slice(0,10), label: ['一','二','三','四','五','六','日'][i-1], isToday: d.toISOString().slice(0,10) === today() });
  }
  return days;
}

function getWeeklyRate() {
  var active = getActiveHabits();
  if (!active.length) return 0;
  var week = getThisWeekDays(), total = 0, filled = 0;
  week.forEach(function(d) {
    total += active.length;
    filled += (state.completions[d.dateStr] || []).filter(function(id) { return active.some(function(h) { return h.id === id; }); }).length;
  });
  return total > 0 ? Math.round((filled / total) * 100) : 0;
}

function getMonthlyBest() {
  var active = getActiveHabits();
  if (!active.length) return null;
  var now = new Date(), monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0,10);
  var best = null, bestStreak = 0;
  active.forEach(function(h) {
    var s = 0, date = new Date();
    for (var i = 0; i < 100; i++) {
      var k = date.toISOString().slice(0,10);
      if (k < monthStart) break;
      if ((state.completions[k] || []).indexOf(h.id) >= 0) { s++; date.setDate(date.getDate()-1); }
      else break;
    }
    if (s > bestStreak) { bestStreak = s; best = h; }
  });
  return bestStreak >= 3 ? best : null;
}

function scoreStars(done, total) {
  if (!total) return '';
  var p = done / total;
  if (p === 1) return '💯';
  if (p >= 0.75) return '😊';
  if (p >= 0.5) return '🙂';
  if (p >= 0.25) return '😐';
  return '';
}

function getHabitStatus(habit) {
  var done = isCompleted(habit.id);
  if (done) return { label: '✅ 今天完成', status: 'done' };
  var target = habit.target || 7;
  if (target >= 7) return { label: '📋 今天该做', status: 'due' };
  var week = getThisWeekDays();
  var weekDone = week.filter(function(d) { return (state.completions[d.dateStr] || []).indexOf(habit.id) >= 0; }).length;
  var remaining = target - weekDone;
  if (remaining <= 0) return { label: '✅ 本周已完成', status: 'done' };
  return { label: '📋 本周还差' + remaining + '次', status: 'due' };
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function saveState() { try { localStorage.setItem(HABIT_KEY, JSON.stringify(state)); } catch(e) {} }
function loadState() {
  try {
    var s = localStorage.getItem(HABIT_KEY);
    if (s) { state = JSON.parse(s); if (Array.isArray(state.completions)) state.completions = {}; }
  } catch(e) {}
}

function exportData() {
  var blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'atomic-habits-backup-' + today() + '.json';
  a.click();
  URL.revokeObjectURL(a.href);
  showToast('📤 已导出');
}

function importData() { document.getElementById('importFileInput').click(); }
document.getElementById('importFileInput').addEventListener('change', function(e) {
  var file = e.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(ev) {
    try {
      var data = JSON.parse(ev.target.result);
      if (confirm('导入将覆盖当前所有数据，确定继续？')) {
        state = data; saveState(); renderAll(); showToast('📥 导入成功');
      }
    } catch(err) { showToast('❌ 导入失败'); }
  };
  reader.readAsText(file);
  e.target.value = '';
});

function showToast(msg, dur) {
  dur = dur || 2500;
  var t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(function() { t.classList.remove('show'); }, dur);
}

function showCompletionToast(msg) {
  var old = document.querySelector('.toast-complete');
  if (old) old.remove();
  var t = document.createElement('div');
  t.className = 'toast-complete';
  t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(function() {
    t.classList.add('toast-show');
    setTimeout(function() {
      t.classList.remove('toast-show');
      setTimeout(function() { t.remove(); }, 400);
    }, 2200);
  });
}

function openModal(id) { var m = document.getElementById(id); if (m) m.classList.add('open'); }
function closeModals() { document.querySelectorAll('.modal.open').forEach(function(m) { m.classList.remove('open'); }); }
document.addEventListener('click', function(e) {
  if (e.target.classList.contains('modal-backdrop')) closeModals();
  if (e.target.classList.contains('modal-close')) closeModals();
});

// Header buttons
document.getElementById('moreMenuBtn').addEventListener('click', function(e) {
  e.stopPropagation();
  var m = document.getElementById('moreMenu');
  m.style.display = m.style.display === 'none' ? 'block' : 'none';
});
document.addEventListener('click', function() {
  var m = document.getElementById('moreMenu');
  if (m) m.style.display = 'none';
});
document.getElementById('exportBtn').addEventListener('click', exportData);
document.getElementById('importBtn').addEventListener('click', importData);
document.getElementById('darkModeBtn').addEventListener('click', function() {
  var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  state.settings.darkMode = next; saveState();
  this.textContent = next === 'dark' ? '☀️ 浅色模式' : '🌙 深色模式';
});
var addHdrBtn = document.getElementById('addHabitBtnHeader');
if (addHdrBtn) addHdrBtn.addEventListener('click', function() { openModal('habitModal'); populateHabitModalDropdowns(); resetHabitForm(); });
var addTop2Btn = document.getElementById('addHabitBtnTop2');
if (addTop2Btn) addTop2Btn.addEventListener('click', function() { openModal('habitModal'); populateHabitModalDropdowns(); resetHabitForm(); });
var addIdBtn = document.getElementById('addIdentityBtn');
if (addIdBtn) addIdBtn.addEventListener('click', function() { openModal('identityModal'); });
var addStkBtn = document.getElementById('addStackBtn');
if (addStkBtn) addStkBtn.addEventListener('click', function() { openModal('stackModal'); populateStackModalSelects(); });

// Hero tip toggle
document.getElementById('heroTipToggle').addEventListener('click', function() {
  var body = document.getElementById('heroTipBody');
  var arrow = document.getElementById('heroTipArrow');
  var isOpen = body.style.display !== 'none';
  body.style.display = isOpen ? 'none' : 'block';
  arrow.textContent = isOpen ? '▼' : '▲';
});

// Toolbox toggle
var toolboxOpen = false;
document.getElementById('toolboxToggle').addEventListener('click', function() {
  toolboxOpen = !toolboxOpen;
  document.getElementById('toolboxContent').style.display = toolboxOpen ? 'block' : 'none';
  document.getElementById('toolboxToggleArrow').textContent = toolboxOpen ? '▲' : '▼';
  document.getElementById('toolboxToggleText').textContent = toolboxOpen ? '收起方法' : '遇到卡顿时再看方法';
});

// Toolbox quick chips
document.getElementById('toolboxQuickChips').addEventListener('click', function(e) {
  var chip = e.target.closest('.chip-quick');
  if (!chip) return;
  var tip = chip.dataset.tip;
  var answers = {
    forget: '<strong>我总是忘</strong>：把习惯绑定到已有习惯后面，如"洗完脸后 → 读1页书"。触发上下文越具体，越不需要意志力。',
    procrastinate: '<strong>我总是拖</strong>：用"2分钟规则"。告诉自己"只做2分钟就好"。最难的是开始，一旦开始往往停不下来。',
    overwhelm: '<strong>我总是开始太大</strong>：把目标缩小到荒谬。1个俯卧撑、读1行、走1分钟。小到不可能失败，然后慢慢加。'
  };
  document.getElementById('toolboxAnswer').innerHTML = answers[tip] || '';
});

// Archived toggle
document.getElementById('toggleArchivedBtn').addEventListener('click', function() {
  var content = document.getElementById('archivedContent');
  var arrow = document.getElementById('archivedArrow');
  var isOpen = content.style.display !== 'none';
  content.style.display = isOpen ? 'none' : 'block';
  arrow.textContent = isOpen ? '▶' : '▼';
});

// ─── Reflection ────────────────────────────────────────────────────────────
function saveReflection() {
  var moodDot = document.querySelector('#moodRating .rating-dot.selected');
  var energyDot = document.querySelector('#energyRating .rating-dot.selected');
  var mood = moodDot && moodDot.dataset && moodDot.dataset.val || 0;
  var energy = energyDot && energyDot.dataset && energyDot.dataset.val || 0;
  var obstacles = [];
  document.querySelectorAll('#obstacleChips .chip-sm.selected').forEach(function(c) { obstacles.push(c.dataset.val); });
  var win = (document.getElementById('reflectionWinText') || {}).value.trim() || '';
  var tomorrow = (document.getElementById('reflectionTomorrowText') || {}).value.trim() || '';
  var text = (document.getElementById('reflectionText') || {}).value.trim() || '';
  var savedEl = document.getElementById('reflectionSaved');
  var data = { mood: mood, energy: energy, obstacles: obstacles, win: win, tomorrow: tomorrow, text: text, savedAt: new Date().toISOString() };
  localStorage.setItem(REFLECTION_KEY + '_' + today(), JSON.stringify(data));
  if (savedEl) { savedEl.textContent = '✓ 已保存'; setTimeout(function() { if (savedEl) savedEl.textContent = ''; }, 2000); }
}

function loadReflection() {
  var key = REFLECTION_KEY + '_' + today();
  var saved = localStorage.getItem(key);
  if (!saved) return;
  try {
    var data = JSON.parse(saved);
    if (data.mood) { var d = document.querySelector('#moodRating .rating-dot[data-val="' + data.mood + '"]'); if (d) d.classList.add('selected'); }
    if (data.energy) { var d = document.querySelector('#energyRating .rating-dot[data-val="' + data.energy + '"]'); if (d) d.classList.add('selected'); }
    if (data.obstacles && Array.isArray(data.obstacles)) {
      data.obstacles.forEach(function(obs) { var c = document.querySelector('#obstacleChips .chip-sm[data-val="' + obs + '"]'); if (c) c.classList.add('selected'); });
    }
    var winEl = document.getElementById('reflectionWinText');
    if (winEl && data.win) winEl.value = data.win;
    var tomEl = document.getElementById('reflectionTomorrowText');
    if (tomEl && data.tomorrow) tomEl.value = data.tomorrow;
    var textEl = document.getElementById('reflectionText');
    if (textEl && data.text) textEl.value = data.text;
    var savedEl = document.getElementById('reflectionSaved');
    if (savedEl) savedEl.textContent = '✓ 已保存';
  } catch(e) {}
}

// Reflection event listeners
document.addEventListener('click', function(e) {
  var dot = e.target.closest('.rating-dot');
  if (dot && dot.closest('.ref-rating')) {
    dot.closest('.ref-rating').querySelectorAll('.rating-dot').forEach(function(d) { d.classList.remove('selected'); });
    dot.classList.add('selected');
    saveReflection();
  }
  var chip = e.target.closest('.obstacle-chips .chip-sm');
  if (chip) { chip.classList.toggle('selected'); saveReflection(); }
});
var reflWin = document.getElementById('reflectionWinText');
if (reflWin) reflWin.addEventListener('input', saveReflection);
var reflTom = document.getElementById('reflectionTomorrowText');
if (reflTom) reflTom.addEventListener('input', saveReflection);
var reflTxt = document.getElementById('reflectionText');
if (reflTxt) reflTxt.addEventListener('input', saveReflection);

// ─── Render: Dashboard ─────────────────────────────────────────────────────
function renderDashboard() {
  var weeklyPct = getWeeklyRate();
  var ring = document.getElementById('progressRing');
  if (ring) ring.style.strokeDashoffset = (2 * Math.PI * 52) * (1 - weeklyPct / 100);
  var pctEl = document.getElementById('weeklyPct');
  if (pctEl) pctEl.textContent = weeklyPct + '%';
  var barChart = document.getElementById('weeklyBarChart');
  if (barChart) {
    var week = getThisWeekDays();
    var active = getActiveHabits();
    barChart.innerHTML = week.map(function(d) {
      var doneCount = (state.completions[d.dateStr] || []).filter(function(id) { return active.some(function(h) { return h.id === id; }); }).length;
      var pct = active.length > 0 ? Math.round((doneCount / active.length) * 100) : 0;
      var cls = pct === 0 ? 'zero' : pct < 100 ? 'partial' : 'full';
      return '<div class="wbar-wrap"><div class="wbar-track"><div class="wbar-fill ' + cls + '" style="height:' + Math.max(pct, 4) + '%"></div></div><div class="wbar-label" style="color:' + (d.isToday ? 'var(--accent)' : 'var(--text-muted)') + ';font-weight:' + (d.isToday ? '700' : '600') + '">' + d.label + '</div></div>';
    }).join('');
  }
  var best = getMonthlyBest();
  var bestEl = document.getElementById('bestHabitDisplay');
  if (bestEl) {
    if (!best) bestEl.innerHTML = '<div class="best-habit-empty">连续完成 3 次后，这里会自动出现你的冠军习惯</div>';
    else bestEl.innerHTML = '<div class="best-icon">🏆</div><div class="best-name" style="color:' + (best.color || 'var(--accent)') + '">' + escHtml(best.name) + '</div><div class="best-streak">🔥 ' + getStreak(best.id) + ' 天连续</div>';
  }
}

// ─── Render: Today Habits ──────────────────────────────────────────────────
function renderTodayHabits() {
  var container = document.getElementById('todayHabitsList');
  var todayCount = document.getElementById('todayCount');
  var active = getActiveHabits();
  var doneToday = active.filter(function(h) { return isCompleted(h.id); }).length;
  if (todayCount) todayCount.textContent = '(' + doneToday + '/' + active.length + ')';
  if (!active.length) {
    var examplesHtml = QUICK_EXAMPLES.map(function(ex) {
      return '<button class="chip chip-example" data-name="' + ex.name + '" data-cue="' + ex.cue + '" data-tiny="' + ex.tinyAction + '" data-color="' + ex.color + '">' + ex.name + '</button>';
    }).join('');
    container.innerHTML = '<div class="empty-state">' +
      '<div class="empty-state-icon">🎯</div>' +
      '<h3>今天还没有可执行习惯</h3>' +
      '<p class="empty-state-sub">先添加 1 个 30 秒内能完成的小习惯</p>' +
      '<button class="btn btn-primary" id="addFirstHabitBtn">添加第一个习惯</button>' +
      '<div class="quick-chips">' + examplesHtml + '</div>' +
      '</div>';
    var btn1 = document.getElementById('addFirstHabitBtn');
    if (btn1) btn1.addEventListener('click', function() { openModal('habitModal'); populateHabitModalDropdowns(); resetHabitForm(); });
    container.querySelectorAll('.chip-example').forEach(function(btn) {
      btn.addEventListener('click', function() { addQuickHabit(btn.dataset.name, btn.dataset.cue, btn.dataset.tiny, btn.dataset.color); });
    });
    return;
  }
  container.innerHTML = active.map(function(habit) {
    var done = isCompleted(habit.id);
    var streak = getStreak(habit.id);
    var status = getHabitStatus(habit);
    var linkedIdentity = habit.linkedIdentityId ? state.identities.find(function(i) { return i.id === habit.linkedIdentityId; }) : null;
    var linkedStack = habit.linkedStackId ? state.stacks.find(function(s) { return s.id === habit.linkedStackId; }) : null;
    var cueTiny = (habit.cue || habit.tinyAction) ? '<div class="habit-card-cue">📌 ' + escHtml(habit.cue || '') + ' → ' + escHtml(habit.tinyAction || '') + '</div>' : '';
    var doClass = 'habit-do-btn' + (done ? ' done' : '');
    var expandLabel = done ? '查看' : '展开';
    return '<div class="habit-card' + (done ? ' habit-card--done' : '') + '" id="habit-card-' + habit.id + '">' +
      '<div class="habit-card-top">' +
        cueTiny +
        '<span class="habit-status habit-status--' + status.status + '">' + status.label + '</span>' +
      '</div>' +
      '<div class="habit-card-name" style="border-left: 3px solid ' + (habit.color || '#f97316') + '">' +
        '<span class="habit-card-title">' + escHtml(habit.name) + '</span>' +
        (streak > 0 ? '<span class="habit-streak">🔥 ' + streak + '</span>' : '') +
      '</div>' +
      '<div class="habit-card-actions">' +
        '<button class="' + doClass + '" data-id="' + habit.id + '">' + (done ? '✓' : '⚡') + '</button>' +
        '<button class="habit-expand-btn" data-id="' + habit.id + '">' + expandLabel + ' »</button>' +
      '</div>' +
      '<div class="habit-card-details" id="habit-details-' + habit.id + '">' +
        (habit.craving ? '<div class="hcd-row"><span class="hcd-label">为什么</span><span class="hcd-value">' + escHtml(habit.craving) + '</span></div>' : '') +
        (habit.reward ? '<div class="hcd-row"><span class="hcd-label">奖励</span><span class="hcd-value">' + escHtml(habit.reward) + '</span></div>' : '') +
        (linkedIdentity ? '<div class="hcd-row"><span class="hcd-label">身份</span><span class="hcd-value">"' + escHtml(linkedIdentity.text) + '"</span></div>' : '') +
        (linkedStack ? '<div class="hcd-row"><span class="hcd-label">堆叠</span><span class="hcd-value">' + escHtml(linkedStack.anchor) + ' → ' + escHtml(linkedStack.newHabit) + '</span></div>' : '') +
        (habit.desc ? '<div class="hcd-row"><span class="hcd-label">备注</span><span class="hcd-value">' + escHtml(habit.desc) + '</span></div>' : '') +
        '<div class="hcd-btns">' +
          '<button class="btn btn-secondary btn-sm" onclick="openLoopModal(\'' + habit.id + '\')">编辑习惯循环</button>' +
          '<button class="btn btn-secondary btn-sm" onclick="archiveHabit(\'' + habit.id + '\')">归档</button>' +
          '<button class="btn-delete btn-sm" onclick="deleteHabit(\'' + habit.id + '\')">删除</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }).join('');
  container.querySelectorAll('.habit-do-btn').forEach(function(btn) {
    btn.addEventListener('click', function() { toggleHabit(btn.dataset.id); });
  });
  container.querySelectorAll('.habit-expand-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var details = document.getElementById('habit-details-' + btn.dataset.id);
      if (details) details.style.display = details.style.display === 'none' ? 'block' : 'none';
    });
  });
}

// ─── Render: Identities ────────────────────────────────────────────────────
function renderIdentities() {
  var grid = document.getElementById('identityGrid');
  if (!grid) return;
  if (!state.identities.length) {
    grid.innerHTML = '<div class="empty-state empty-state--sm"><div class="empty-state-icon">🪪</div><p>先定义你想成为什么样的人</p><button class="btn btn-secondary btn-sm" id="addFirstIdentityBtn">+ 添加身份</button></div>';
    var btn = document.getElementById('addFirstIdentityBtn');
    if (btn) btn.addEventListener('click', function() { openModal('identityModal'); });
    return;
  }
  grid.innerHTML = state.identities.map(function(id) {
    return '<div class="identity-card"><div class="identity-text">"' + escHtml(id.text) + '"</div>' +
      (id.why ? '<div class="identity-why">' + escHtml(id.why) + '</div>' : '') +
      '<button class="btn-delete btn-sm" onclick="deleteIdentity(\'' + id.id + '\')">删除</button></div>';
  }).join('');
}

// ─── Render: Stacks ────────────────────────────────────────────────────────
function renderStacks() {
  var grid = document.getElementById('stacksGrid');
  if (!grid) return;
  if (!state.stacks.length) {
    grid.innerHTML = '<div class="empty-state empty-state--sm"><div class="empty-state-icon">🔗</div><p>创建你的第一个习惯堆叠</p><button class="btn btn-secondary btn-sm" id="addFirstStackBtn">+ 添加堆叠</button></div>';
    var btn = document.getElementById('addFirstStackBtn');
    if (btn) btn.addEventListener('click', function() { openModal('stackModal'); populateStackModalSelects(); });
    return;
  }
  grid.innerHTML = state.stacks.map(function(s) {
    return '<div class="stack-card"><div class="stack-anchor">' + escHtml(s.anchor) + '</div><div class="stack-arrow">↓</div><div class="stack-new">' + escHtml(s.newHabit) + '</div>' +
      (s.cue ? '<div class="stack-cue">🔔 ' + escHtml(s.cue) + '</div>' : '') +
      '<button class="btn-delete btn-sm" onclick="deleteStack(\'' + s.id + '\')">删除</button></div>';
  }).join('');
}

// ─── Render: Archived ───────────────────────────────────────────────────────
function renderArchived() {
  var archived = state.habits.filter(function(h) { return h.archived; });
  var countEl = document.getElementById('archivedCount');
  if (countEl) countEl.textContent = '(' + archived.length + ')';
  var grid = document.getElementById('archivedGrid');
  if (!grid) return;
  if (!archived.length) {
    grid.innerHTML = '<div class="empty-state empty-state--sm"><p>暂时没有归档习惯</p><p class="empty-state-sub">归档的习惯可以随时恢复</p></div>';
    return;
  }
  grid.innerHTML = archived.map(function(h) {
    return '<div class="habit-card habit-card--archived"><div class="habit-card-name" style="border-left: 3px solid ' + (h.color || '#888') + '">' + escHtml(h.name) + '</div>' +
      '<button class="btn btn-secondary btn-sm" onclick="unarchiveHabit(\'' + h.id + '\')">恢复</button>' +
      '<button class="btn-delete btn-sm" onclick="deleteHabit(\'' + h.id + '\')">删除</button></div>';
  }).join('');
}

// ─── Render All ────────────────────────────────────────────────────────────
function renderAll() {
  var active = getActiveHabits();
  var doneToday = active.filter(function(h) { return isCompleted(h.id); }).length;
  var scoreEl = document.getElementById('dailyScore');
  var totalEl = document.getElementById('totalHabits');
  var starsEl = document.getElementById('scoreStars');
  if (scoreEl) scoreEl.textContent = doneToday;
  if (totalEl) totalEl.textContent = active.length;
  if (starsEl) starsEl.textContent = scoreStars(doneToday, active.length);
  renderDashboard();
  renderTodayHabits();
  renderIdentities();
  renderStacks();
  renderArchived();
  populateStackModalSelects();
  var reflDate = document.getElementById('reflectionDate');
  if (reflDate) { var d = new Date(); reflDate.textContent = (d.getMonth()+1) + '月' + d.getDate() + '日'; }
}

// ─── Toggle Habit ──────────────────────────────────────────────────────────
function toggleHabit(id) {
  var habit = state.habits.find(function(h) { return h.id === id; });
  if (!habit) return;
  var todayKey = today();
  if (!state.completions[todayKey]) state.completions[todayKey] = [];
  var idx = state.completions[todayKey].indexOf(id);
  var wasCompleted = idx >= 0;
  if (wasCompleted) {
    state.completions[todayKey].splice(idx, 1);
  } else {
    state.completions[todayKey].push(id);
    var newStreak = getStreak(id);
    var milestone = MILESTONES.find(function(m) { return m.days === newStreak; });
    if (milestone) celebrateMilestone(milestone);
    var reward = habit.reward || '做得好！';
    showCompletionToast('✅ ' + habit.name + (habit.reward ? ' — ' + habit.reward : ''));
    var scoreEl = document.getElementById('dailyScore');
    if (scoreEl) { scoreEl.classList.remove('pop-anim'); void scoreEl.offsetWidth; scoreEl.classList.add('pop-anim'); }
  }
  saveState();
  renderAll();
  saveReflection();
}

function celebrateMilestone(m) {
  var container = document.getElementById('todayHabitsList');
  if (container) {
    var banner = document.createElement('div');
    banner.className = 'milestone-banner';
    banner.innerHTML = '<div class="mb-icon">' + m.icon + '</div><div class="mb-text"><strong>' + m.label + '达成！</strong></div><div class="mb-sub">' + m.sub + '</div>';
    container.insertBefore(banner, container.firstChild);
    setTimeout(function() { if (banner.parentNode) banner.remove(); }, 5000);
  }
  launchConfetti();
}

function launchConfetti() {
  var canvas = document.getElementById('confettiCanvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  var particles = [];
  var colors = ['#f97316','#10b981','#3b82f6','#8b5cf6','#ec4899','#eab308','#ef4444'];
  for (var i = 0; i < 120; i++) {
    particles.push({ x: Math.random()*canvas.width, y: -20-Math.random()*100, vx: (Math.random()-0.5)*4, vy: Math.random()*3+2, color: colors[Math.floor(Math.random()*colors.length)], size: Math.random()*8+4, rotation: Math.random()*360, rotationSpeed: (Math.random()-0.5)*10, shape: Math.random()>0.5?'rect':'circle', opacity: 1 });
  }
  var frame = 0;
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(function(p) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.08; p.rotation += p.rotationSpeed; p.opacity = Math.max(0, 1 - p.y/canvas.height);
      ctx.save(); ctx.globalAlpha = p.opacity; ctx.translate(p.x, p.y); ctx.rotate(p.rotation * Math.PI / 180); ctx.fillStyle = p.color;
      if (p.shape === 'rect') ctx.fillRect(-p.size/2, -p.size/4, p.size, p.size/2);
      else { ctx.beginPath(); ctx.arc(0, 0, p.size/2, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    });
    frame++;
    if (frame < 180) requestAnimationFrame(animate);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  animate();
}

// ─── CRUD ─────────────────────────────────────────────────────────────────
function addQuickHabit(name, cue, tinyAction, color) {
  state.habits.push({ id: generateId(), name: name, cue: cue, tinyAction: tinyAction, target: 7, color: color, craving: '', reward: '', desc: '', createdAt: new Date().toISOString(), archived: false, customFreq: '', linkedIdentityId: '', linkedStackId: '' });
  saveState(); renderAll();
}

function deleteHabit(id) {
  if (!confirm('删除此习惯？此操作无法撤销。')) return;
  state.habits = state.habits.filter(function(h) { return h.id !== id; });
  Object.keys(state.completions).forEach(function(date) { state.completions[date] = state.completions[date].filter(function(x) { return x !== id; }); });
  saveState(); renderAll();
}

function archiveHabit(id) { var h = state.habits.find(function(x) { return x.id === id; }); if (h) { h.archived = true; saveState(); renderAll(); } }
function unarchiveHabit(id) { var h = state.habits.find(function(x) { return x.id === id; }); if (h) { h.archived = false; saveState(); renderAll(); } }
function deleteIdentity(id) { state.identities = state.identities.filter(function(i) { return i.id !== id; }); saveState(); renderAll(); }
function deleteStack(id) { state.stacks = state.stacks.filter(function(s) { return s.id !== id; }); saveState(); renderAll(); }

// ───// ─── Habit Form ───────────────────────────────────────────────────────────
function resetHabitForm() {
  var form = document.getElementById('habitForm');
  if (form) form.reset();
  var cfg = document.getElementById('customFreqGroup');
  if (cfg) cfg.style.display = 'none';
  var preview = document.getElementById('habitPreview');
  if (preview) preview.classList.remove('visible');
  var adv = document.getElementById('advancedSection');
  if (adv) adv.classList.remove('open');
  var advText = document.getElementById('advancedToggleText');
  if (advText) advText.textContent = '展开更多设置';
  var advArrow = document.getElementById('advancedToggleArrow');
  if (advArrow) advArrow.textContent = '▼';
  document.querySelectorAll('.color-dot').forEach(function(d, i) { d.classList.toggle('active', i === 0); });
}

function populateHabitModalDropdowns() {
  var identitySel = document.getElementById('habitIdentitySelect');
  if (identitySel) {
    identitySel.innerHTML = '<option value="">— 不关联身份 —</option>';
    state.identities.forEach(function(id) {
      var opt = document.createElement('option'); opt.value = id.id; opt.textContent = id.text; identitySel.appendChild(opt);
    });
  }
  var stackSel = document.getElementById('habitStackSelect');
  if (stackSel) {
    stackSel.innerHTML = '<option value="">— 不关联堆叠 —</option>';
    state.stacks.forEach(function(st) {
      var opt = document.createElement('option'); opt.value = st.id; opt.textContent = (st.anchor || '') + ' → ' + (st.newHabit || ''); stackSel.appendChild(opt);
    });
  }
}

document.getElementById('habitForm').addEventListener('submit', function(e) {
  e.preventDefault();
  var name = (document.getElementById('habitName') || {}).value.trim();
  if (!name) return;
  var targetVal = (document.getElementById('habitTarget') || {}).value || '7';
  var customFreq = targetVal === 'custom' ? ((document.getElementById('customFreqInput') || {}).value || '').trim() : '';
  var activeColor = document.querySelector('.color-dot.active');
  var habit = {
    id: generateId(),
    name: name,
    cue: (document.getElementById('habitCue') || {}).value.trim() || '',
    tinyAction: (document.getElementById('habitTinyAction') || {}).value.trim() || '',
    target: targetVal === 'custom' ? 7 : parseInt(targetVal),
    customFreq: customFreq,
    craving: (document.getElementById('habitMotivation') || {}).value.trim() || '',
    reward: (document.getElementById('habitInstantReward') || {}).value.trim() || '',
    desc: (document.getElementById('habitDesc') || {}).value.trim() || '',
    color: (activeColor && activeColor.dataset && activeColor.dataset.color) || '#f97316',
    linkedIdentityId: (document.getElementById('habitIdentitySelect') || {}).value || '',
    linkedStackId: (document.getElementById('habitStackSelect') || {}).value || '',
    createdAt: new Date().toISOString(),
    archived: false
  };
  state.habits.push(habit);
  saveState();
  closeModals();
  resetHabitForm();
  renderAll();
});

document.getElementById('identityForm').addEventListener('submit', function(e) {
  e.preventDefault();
  var text = (document.getElementById('identityText') || {}).value.trim();
  if (!text) return;
  state.identities.push({ id: generateId(), text: text, why: (document.getElementById('identityWhy') || {}).value.trim() || '' });
  saveState();
  closeModals();
  document.getElementById('identityForm').reset();
  renderAll();
});

document.getElementById('stackForm').addEventListener('submit', function(e) {
  e.preventDefault();
  var anchor = (document.getElementById('stackAnchor') || {}).value.trim();
  var newHabit = (document.getElementById('stackNew') || {}).value.trim();
  if (!anchor || !newHabit) return;
  state.stacks.push({
    id: generateId(),
    anchor: anchor,
    newHabit: newHabit,
    habitId: (document.getElementById('stackHabitId') || {}).value || '',
    identityId: (document.getElementById('stackIdentityId') || {}).value || '',
    cue: (document.getElementById('stackCue') || {}).value.trim() || ''
  });
  saveState();
  closeModals();
  document.getElementById('stackForm').reset();
  renderAll();
});

document.getElementById('loopForm').addEventListener('submit', function(e) {
  e.preventDefault();
  var habitId = (document.getElementById('loopHabitId') || {}).value;
  var habit = state.habits.find(function(h) { return h.id === habitId; });
  if (!habit) return;
  habit.cue = (document.getElementById('loopCue') || {}).value.trim() || '';
  habit.craving = (document.getElementById('loopCraving') || {}).value.trim() || '';
  habit.tinyAction = (document.getElementById('loopResponse') || {}).value.trim() || '';
  habit.reward = (document.getElementById('loopReward') || {}).value.trim() || '';
  saveState();
  closeModals();
  renderAll();
});

function openLoopModal(habitId) {
  var habit = state.habits.find(function(h) { return h.id === habitId; });
  if (!habit) return;
  document.getElementById('loopHabitId').value = habitId;
  document.getElementById('loopCue').value = habit.cue || '';
  document.getElementById('loopCraving').value = habit.craving || '';
  document.getElementById('loopResponse').value = habit.tinyAction || '';
  document.getElementById('loopReward').value = habit.reward || '';
  openModal('loopModal');
}

function populateStackModalSelects() {
  var habitSel = document.getElementById('stackHabitId');
  var identitySel = document.getElementById('stackIdentityId');
  if (habitSel) {
    habitSel.innerHTML = '<option value="">（不关联）</option>';
    getActiveHabits().forEach(function(h) {
      var opt = document.createElement('option'); opt.value = h.id; opt.textContent = h.name; habitSel.appendChild(opt);
    });
  }
  if (identitySel) {
    identitySel.innerHTML = '<option value="">（不关联）</option>';
    state.identities.forEach(function(id) {
      var opt = document.createElement('option'); opt.value = id.id; opt.textContent = id.text; identitySel.appendChild(opt);
    });
  }
}

// ─── Habit preview ───────────────────────────────────────────────────────
function updateHabitPreview() {
  var name = (document.getElementById('habitName') || {}).value.trim();
  var cue = (document.getElementById('habitCue') || {}).value.trim();
  var tiny = (document.getElementById('habitTinyAction') || {}).value.trim();
  var preview = document.getElementById('habitPreview');
  var previewText = document.getElementById('habitPreviewText');
  if (!preview || !previewText) return;
  if (name || cue || tiny) {
    preview.classList.add('visible');
    previewText.textContent = (cue ? '📌 ' + cue : '') + ' → ' + (tiny ? '⚡ ' + tiny : '');
  } else {
    preview.classList.remove('visible');
  }
}
document.getElementById('habitName') && document.getElementById('habitName').addEventListener('input', updateHabitPreview);
document.getElementById('habitCue') && document.getElementById('habitCue').addEventListener('input', updateHabitPreview);
document.getElementById('habitTinyAction') && document.getElementById('habitTinyAction').addEventListener('input', updateHabitPreview);

// ─── Advanced toggle ────────────────────────────────────────────────────
document.getElementById('advancedToggle') && document.getElementById('advancedToggle').addEventListener('click', function() {
  var section = document.getElementById('advancedSection');
  var text = document.getElementById('advancedToggleText');
  var arrow = document.getElementById('advancedToggleArrow');
  var isOpen = section.classList.contains('open');
  section.classList.toggle('open', !isOpen);
  text.textContent = isOpen ? '展开更多设置' : '收起更多设置';
  arrow.textContent = isOpen ? '▼' : '▲';
});

// Frequency custom toggle
document.getElementById('habitTarget') && document.getElementById('habitTarget').addEventListener('change', function() {
  var cfg = document.getElementById('customFreqGroup');
  if (cfg) cfg.style.display = this.value === 'custom' ? 'block' : 'none';
});

// Preset chips
document.addEventListener('click', function(e) {
  var chip = e.target.closest('.chip[data-val]');
  if (!chip) return;
  var parent = chip.parentElement;
  if (parent.id === 'cueChips') {
    var input = document.getElementById('habitCue');
    if (input) { input.value = chip.dataset.val; updateHabitPreview(); }
  } else if (parent.id === 'tinyActionChips') {
    var input = document.getElementById('habitTinyAction');
    if (input) { input.value = chip.dataset.val; updateHabitPreview(); }
  }
});

// Color picker
document.addEventListener('click', function(e) {
  var dot = e.target.closest('.color-dot');
  if (!dot) return;
  document.querySelectorAll('.color-dot').forEach(function(d) { d.classList.remove('active'); });
  dot.classList.add('active');
});

// ─── Boot ───────────────────────────────────────────────────────────────
loadState();
if (state.settings && state.settings.darkMode) {
  document.documentElement.setAttribute('data-theme', state.settings.darkMode);
  var dmBtn = document.getElementById('darkModeBtn');
  if (dmBtn) dmBtn.textContent = state.settings.darkMode === 'dark' ? '☀️ 浅色模式' : '🌙 深色模式';
}
renderAll();
loadReflection();


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
  if (addBtn) addBtn.addEventListener('click', function() { openModal('habitModal'); });
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
        linkedIdentityId: '',
        linkedStackId: ''
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

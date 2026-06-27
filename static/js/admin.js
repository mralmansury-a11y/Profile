// ═══════════════════════════════════════════════
//  MRAHEEL ADMIN DASHBOARD — APPLICATION LOGIC
// ═══════════════════════════════════════════════

const STATUS_LABELS = { pending: 'معلق', confirmed: 'مؤكد', completed: 'مكتمل', cancelled: 'ملغي' };
const STATUS_COLORS = { pending: '#FFB454', confirmed: '#4FE3D6', completed: '#3DDC84', cancelled: '#FF6B81' };

const state = {
  page: 'overview',
  projects: [],
  orders: [],
  messages: [],
  skills: [],
  overview: null,
  projectFilter: 'all',
  projectQuery: '',
  orderFilter: 'all',
  orderQuery: '',
  msgFilter: 'all',
};

// ─── Utilities ───────────────────────────────────

function esc(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function fmtMoney(n) {
  return Math.round(n || 0).toLocaleString('ar-LY');
}

function fmtDate(s) {
  if (!s) return '—';
  return s.slice(0, 10);
}

function timeAgo(s) {
  if (!s) return '';
  const then = new Date(s.replace(' ', 'T') + 'Z');
  const diffMin = Math.floor((Date.now() - then.getTime()) / 60000);
  if (diffMin < 1) return 'الآن';
  if (diffMin < 60) return `منذ ${diffMin} د`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `منذ ${diffH} س`;
  const diffD = Math.floor(diffH / 24);
  return `منذ ${diffD} ي`;
}

async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (res.status === 401) {
    window.location.href = '/admin/login';
    throw new Error('unauthorized');
  }
  if (!res.ok) throw new Error('request failed');
  return res.json();
}

function toast(message, type = 'success') {
  const stack = document.getElementById('toastStack');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="toast-icon">${type === 'success' ? '✅' : '⚠️'}</span><span>${esc(message)}</span>`;
  stack.appendChild(el);
  setTimeout(() => {
    el.classList.add('leaving');
    setTimeout(() => el.remove(), 250);
  }, 3000);
}

// ─── Modal helpers ───────────────────────────────

function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

document.querySelectorAll('[data-close]').forEach(btn => {
  btn.addEventListener('click', () => closeModal(btn.dataset.close));
});
document.querySelectorAll('.modal-overlay').forEach(ov => {
  ov.addEventListener('click', e => { if (e.target === ov) ov.classList.remove('open'); });
});

let confirmCallback = null;
function askConfirm(title, text, callback) {
  document.getElementById('confirmTitle').textContent = title;
  document.getElementById('confirmText').textContent = text;
  confirmCallback = callback;
  openModal('confirmModal');
}
document.getElementById('confirmActionBtn').addEventListener('click', async () => {
  if (confirmCallback) await confirmCallback();
  closeModal('confirmModal');
});

// ─── Navigation ──────────────────────────────────

const PAGE_META = {
  overview: { title: 'نظرة عامة', crumb: 'admin / overview' },
  projects: { title: 'المشاريع', crumb: 'admin / projects' },
  skills: { title: 'المهارات', crumb: 'admin / skills' },
  orders: { title: 'الطلبات', crumb: 'admin / orders' },
  messages: { title: 'الرسائل', crumb: 'admin / messages' },
};

function goToPage(page) {
  state.page = page;
  document.querySelectorAll('.admin-page-section').forEach(s => s.classList.remove('active'));
  document.getElementById(`page-${page}`).classList.add('active');
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.toggle('active', l.dataset.page === page));
  document.getElementById('topbarTitle').textContent = PAGE_META[page].title;
  document.getElementById('topbarCrumb').textContent = PAGE_META[page].crumb;
  closeSidebarMobile();

  if (page === 'projects' && state.projects.length === 0) loadProjects();
  if (page === 'skills' && state.skills.length === 0) loadSkills();
  if (page === 'orders' && state.orders.length === 0) loadOrders();
  if (page === 'messages' && state.messages.length === 0) loadMessages();
}

document.querySelectorAll('.sidebar-link').forEach(link => {
  link.addEventListener('click', () => goToPage(link.dataset.page));
});
document.querySelectorAll('[data-goto]').forEach(link => {
  link.addEventListener('click', e => { e.preventDefault(); goToPage(link.dataset.goto); });
});

// Mobile sidebar toggle
const sidebar = document.getElementById('adminSidebar');
const scrim = document.getElementById('sidebarScrim');
function openSidebarMobile() { sidebar.classList.add('open'); scrim.classList.add('show'); }
function closeSidebarMobile() { sidebar.classList.remove('open'); scrim.classList.remove('show'); }
document.getElementById('topbarMenuBtn').addEventListener('click', openSidebarMobile);
scrim.addEventListener('click', closeSidebarMobile);

// ─── OVERVIEW ────────────────────────────────────

function renderKPIs(stats) {
  const cards = [
    { cls: 'c-cyan', icon: '📁', value: stats.projects, label: 'إجمالي المشاريع', trend: `${stats.for_sale} للبيع`, trendType: 'flat' },
    { cls: 'c-violet', icon: '🛒', value: stats.orders, label: 'إجمالي الطلبات', trend: stats.orders_pending > 0 ? `${stats.orders_pending} معلق` : 'لا معلق', trendType: stats.orders_pending > 0 ? 'down' : 'up' },
    { cls: 'c-green', icon: '💰', value: `${fmtMoney(stats.revenue)} د.ل`, label: 'الإيراد المحقق', trend: stats.pending_revenue > 0 ? `+${fmtMoney(stats.pending_revenue)} متوقع` : 'مكتمل', trendType: 'up' },
    { cls: 'c-amber', icon: '📩', value: stats.messages, label: 'إجمالي الرسائل', trend: stats.messages_unread > 0 ? `${stats.messages_unread} جديدة` : 'الكل مقروء', trendType: stats.messages_unread > 0 ? 'down' : 'up' },
  ];
  document.getElementById('kpiGrid').innerHTML = cards.map(c => `
    <div class="kpi-card ${c.cls}">
      <div class="kpi-top">
        <div class="kpi-icon">${c.icon}</div>
        <span class="kpi-trend ${c.trendType}">${c.trend}</span>
      </div>
      <div class="kpi-value">${c.value}</div>
      <div class="kpi-label">${c.label}</div>
    </div>
  `).join('');
}

function renderRevenueChart(series) {
  const wrap = document.getElementById('revenueChart');
  const max = Math.max(...series.map(d => d.total), 1);
  const w = 600, h = 220, pad = 30;
  const stepX = (w - pad * 2) / (series.length - 1 || 1);
  const points = series.map((d, i) => {
    const x = pad + i * stepX;
    const y = h - pad - (d.total / max) * (h - pad * 2 - 20);
    return [x, y];
  });
  const linePath = points.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(' ');
  const areaPath = `${linePath} L${points[points.length - 1][0]},${h - pad} L${points[0][0]},${h - pad} Z`;

  const hasAny = series.some(d => d.total > 0);
  if (!hasAny) {
    wrap.innerHTML = `<div class="chart-empty">لا توجد إيرادات مكتملة بعد خلال هذه الفترة</div>`;
    document.getElementById('revenueRangeLabel').textContent = '';
    return;
  }

  document.getElementById('revenueRangeLabel').textContent = `إجمالي: ${fmtMoney(series.reduce((a, b) => a + b.total, 0))} د.ل`;

  const labelEvery = Math.ceil(series.length / 7);
  const labels = series.map((d, i) => (i % labelEvery === 0 ? `<text x="${points[i][0]}" y="${h - 6}" font-size="9" fill="#5C6678" text-anchor="middle" font-family="JetBrains Mono">${d.date.slice(5)}</text>` : '')).join('');
  const dots = points.map((p, i) => series[i].total > 0 ? `<circle cx="${p[0]}" cy="${p[1]}" r="3.2" fill="#4FE3D6" />` : '').join('');

  wrap.innerHTML = `
    <svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#4FE3D6" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="#4FE3D6" stop-opacity="0"/>
        </linearGradient>
      </defs>
      ${[0.25, 0.5, 0.75].map(f => `<line x1="${pad}" y1="${pad + f * (h - pad * 2 - 20)}" x2="${w - pad}" y2="${pad + f * (h - pad * 2 - 20)}" stroke="#1A212C" stroke-width="1"/>`).join('')}
      <path d="${areaPath}" fill="url(#revGrad)" />
      <path d="${linePath}" fill="none" stroke="#4FE3D6" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
      ${dots}
      ${labels}
    </svg>
  `;
}

function renderStatusDonut(orders) {
  const counts = { pending: 0, confirmed: 0, completed: 0, cancelled: 0 };
  orders.forEach(o => { if (counts[o.status] !== undefined) counts[o.status]++; });
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const wrap = document.getElementById('statusDonut');
  const legend = document.getElementById('statusLegend');

  if (total === 0) {
    wrap.innerHTML = `<div class="chart-empty">لا توجد طلبات بعد</div>`;
    legend.innerHTML = '';
    return;
  }

  const r = 60, cx = 90, cy = 90, strokeW = 26;
  const circumference = 2 * Math.PI * r;
  let offset = 0;
  const segments = Object.entries(counts).filter(([, v]) => v > 0).map(([key, val]) => {
    const frac = val / total;
    const len = frac * circumference;
    const seg = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${STATUS_COLORS[key]}" stroke-width="${strokeW}"
      stroke-dasharray="${len} ${circumference - len}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${cx} ${cy})" stroke-linecap="butt" />`;
    offset += len;
    return seg;
  }).join('');

  wrap.innerHTML = `
    <svg viewBox="0 0 180 180" xmlns="http://www.w3.org/2000/svg" style="max-width:200px;margin:0 auto;display:block">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#1A212C" stroke-width="${strokeW}" />
      ${segments}
      <text x="${cx}" y="${cy - 4}" text-anchor="middle" font-size="22" font-weight="800" fill="#EAF0F6" font-family="JetBrains Mono">${total}</text>
      <text x="${cx}" y="${cy + 16}" text-anchor="middle" font-size="10" fill="#5C6678">إجمالي الطلبات</text>
    </svg>
  `;

  legend.innerHTML = Object.entries(counts).map(([key, val]) => `
    <div class="donut-legend-item">
      <span class="donut-dot" style="background:${STATUS_COLORS[key]}"></span>
      <span class="donut-legend-label">${STATUS_LABELS[key]}</span>
      <span class="donut-legend-value">${val}</span>
    </div>
  `).join('');
}

function renderRecentOrders(orders) {
  const el = document.getElementById('recentOrdersList');
  if (!orders.length) { el.innerHTML = `<div class="panel-empty">لا توجد طلبات حديثة</div>`; return; }
  el.innerHTML = orders.map(o => `
    <div class="activity-item">
      <div class="activity-icon" style="background:${STATUS_COLORS[o.status]}22;color:${STATUS_COLORS[o.status]}">🛒</div>
      <div class="activity-main">
        <div class="activity-title">${esc(o.buyer_name)} — ${esc(o.title)}</div>
        <div class="activity-sub">${STATUS_LABELS[o.status] || o.status} · ${fmtMoney(o.amount)} د.ل</div>
      </div>
      <div class="activity-meta">${timeAgo(o.created_at)}</div>
    </div>
  `).join('');
}

function renderRecentMessages(messages) {
  const el = document.getElementById('recentMessagesList');
  if (!messages.length) { el.innerHTML = `<div class="panel-empty">لا توجد رسائل حديثة</div>`; return; }
  el.innerHTML = messages.map(m => `
    <div class="activity-item">
      <div class="activity-icon" style="background:var(--cyan-dim);color:var(--cyan)">📩</div>
      <div class="activity-main">
        <div class="activity-title">${esc(m.name)} ${m.is_read ? '' : '· جديد'}</div>
        <div class="activity-sub">${esc(m.subject || m.message.slice(0, 40))}</div>
      </div>
      <div class="activity-meta">${timeAgo(m.created_at)}</div>
    </div>
  `).join('');
}

async function loadOverview() {
  try {
    const data = await api('/admin/api/overview');
    state.overview = data;
    renderKPIs(data.stats);
    renderRevenueChart(data.revenue_series);
    renderRecentOrders(data.recent_orders);
    renderRecentMessages(data.recent_messages);
    updateNavBadges(data.stats);
    // fetch all orders quietly for the donut (status breakdown needs full set)
    const ordersData = await api('/admin/api/orders');
    state.orders = ordersData.orders;
    renderStatusDonut(state.orders);
  } catch (e) {
    console.error(e);
  }
}

function updateNavBadges(stats) {
  const ordersBadge = document.getElementById('navOrdersBadge');
  const msgBadge = document.getElementById('navMessagesBadge');
  if (stats.orders_pending > 0) { ordersBadge.style.display = 'inline-block'; ordersBadge.textContent = stats.orders_pending; }
  else ordersBadge.style.display = 'none';
  if (stats.messages_unread > 0) { msgBadge.style.display = 'inline-block'; msgBadge.textContent = stats.messages_unread; }
  else msgBadge.style.display = 'none';
}

// ─── PROJECTS ────────────────────────────────────

function projectIcon(title) {
  if (/ticket/i.test(title)) return '🎫';
  if (/stadium|books/i.test(title)) return '🏟️';
  if (/coffee/i.test(title)) return '☕';
  if (/samba/i.test(title)) return '💃';
  return '💻';
}

function renderProjectsTable() {
  let list = state.projects;
  if (state.projectFilter === 'featured') list = list.filter(p => p.is_featured);
  if (state.projectFilter === 'sale') list = list.filter(p => p.is_for_sale);
  if (state.projectQuery) {
    const q = state.projectQuery.toLowerCase();
    list = list.filter(p => (p.title + ' ' + (p.title_ar || '')).toLowerCase().includes(q));
  }

  const body = document.getElementById('projectsTableBody');
  const empty = document.getElementById('projectsEmpty');
  if (!list.length) { body.innerHTML = ''; empty.style.display = 'block'; return; }
  empty.style.display = 'none';

  body.innerHTML = list.map(p => `
    <tr>
      <td>
        <div class="row-flex">
          <div class="row-thumb">${projectIcon(p.title)}</div>
          <div>
            <div class="row-name">${esc(p.title)}</div>
            <div class="row-sub">${esc(p.title_ar || '')}</div>
          </div>
        </div>
      </td>
      <td class="cell-muted">${esc(p.category || 'web')}</td>
      <td class="cell-mono">${p.is_for_sale ? fmtMoney(p.price) + ' د.ل' : '—'}</td>
      <td>
        <span class="tag-pill ${p.is_featured ? 'gold' : 'gray'}">${p.is_featured ? '⭐ مميز' : 'عادي'}</span>
        <span class="tag-pill ${p.is_for_sale ? 'on' : 'off'}">${p.is_for_sale ? 'للبيع' : 'غير معروض'}</span>
      </td>
      <td>
        <div class="row-actions">
          <button class="icon-btn" data-edit-project="${p.id}" title="تعديل">✏️</button>
          <a class="icon-btn" href="/project/${p.id}" target="_blank" title="عرض">👁️</a>
          <button class="icon-btn danger" data-delete-project="${p.id}" title="حذف">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');

  body.querySelectorAll('[data-edit-project]').forEach(btn => {
    btn.addEventListener('click', () => openProjectModal(parseInt(btn.dataset.editProject)));
  });
  body.querySelectorAll('[data-delete-project]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.deleteProject);
      const proj = state.projects.find(p => p.id === id);
      askConfirm('حذف المشروع', `هل أنت متأكد من حذف "${proj?.title || ''}"؟ لا يمكن التراجع عن هذا الإجراء.`, async () => {
        await api(`/admin/api/projects/${id}`, { method: 'DELETE' });
        state.projects = state.projects.filter(p => p.id !== id);
        renderProjectsTable();
        toast('تم حذف المشروع');
      });
    });
  });
}

async function loadProjects() {
  const data = await api('/admin/api/projects');
  state.projects = data.projects;
  renderProjectsTable();
}

document.getElementById('projectSearch').addEventListener('input', e => {
  state.projectQuery = e.target.value;
  renderProjectsTable();
});
document.querySelectorAll('#projectFilterChips .toolbar-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('#projectFilterChips .toolbar-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    state.projectFilter = chip.dataset.filter;
    renderProjectsTable();
  });
});

function openProjectModal(id) {
  const isEdit = !!id;
  document.getElementById('projectModalTitle').textContent = isEdit ? 'تعديل المشروع' : 'مشروع جديد';
  const p = isEdit ? state.projects.find(x => x.id === id) : {};
  document.getElementById('pf_id').value = id || '';
  document.getElementById('pf_title').value = p.title || '';
  document.getElementById('pf_title_ar').value = p.title_ar || '';
  document.getElementById('pf_description').value = p.description || '';
  document.getElementById('pf_description_ar').value = p.description_ar || '';
  document.getElementById('pf_tech_stack').value = p.tech_stack || '';
  document.getElementById('pf_price').value = p.price || 0;
  document.getElementById('pf_demo_url').value = p.demo_url || '';
  document.getElementById('pf_github_url').value = p.github_url || '';
  document.getElementById('pf_category').value = p.category || 'web';
  document.getElementById('pf_is_for_sale').checked = !!p.is_for_sale;
  document.getElementById('pf_is_featured').checked = !!p.is_featured;
  openModal('projectModal');
}

document.getElementById('addProjectBtn').addEventListener('click', () => openProjectModal(null));

document.getElementById('saveProjectBtn').addEventListener('click', async () => {
  const id = document.getElementById('pf_id').value;
  const payload = {
    title: document.getElementById('pf_title').value.trim(),
    title_ar: document.getElementById('pf_title_ar').value.trim(),
    description: document.getElementById('pf_description').value.trim(),
    description_ar: document.getElementById('pf_description_ar').value.trim(),
    tech_stack: document.getElementById('pf_tech_stack').value.trim(),
    price: document.getElementById('pf_price').value || 0,
    demo_url: document.getElementById('pf_demo_url').value.trim(),
    github_url: document.getElementById('pf_github_url').value.trim(),
    category: document.getElementById('pf_category').value,
    is_for_sale: document.getElementById('pf_is_for_sale').checked,
    is_featured: document.getElementById('pf_is_featured').checked,
  };
  if (!payload.title) { toast('العنوان مطلوب', 'error'); return; }

  try {
    if (id) {
      const res = await api(`/admin/api/projects/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      const idx = state.projects.findIndex(p => p.id === parseInt(id));
      if (idx > -1) state.projects[idx] = res.project;
      toast('تم تحديث المشروع');
    } else {
      const res = await api('/admin/api/projects', { method: 'POST', body: JSON.stringify(payload) });
      state.projects.unshift(res.project);
      toast('تمت إضافة المشروع');
    }
    closeModal('projectModal');
    renderProjectsTable();
  } catch (e) {
    toast('حدث خطأ، حاول مرة أخرى', 'error');
  }
});

// ─── SKILLS ──────────────────────────────────────

function renderSkillsGrid() {
  const grid = document.getElementById('skillsGrid');
  if (!state.skills.length) { grid.innerHTML = `<div class="empty-state"><span class="empty-icon">🧩</span><p>لا توجد مهارات</p></div>`; return; }
  grid.innerHTML = state.skills.map(s => `
    <div class="admin-skill-card" data-skill-id="${s.id}">
      <div class="admin-skill-top">
        <span style="font-size:1.3rem">${esc(s.icon || '⭐')}</span>
        <input type="text" value="${esc(s.name)}" data-field="name">
        <button class="icon-btn danger" data-delete-skill="${s.id}" title="حذف">🗑️</button>
      </div>
      <div class="admin-skill-level-row">
        <input type="range" min="0" max="100" value="${s.level}" data-field="level">
        <span class="level-label">${s.level}%</span>
      </div>
      <span class="skill-cat-badge" style="margin-top:0.6rem;display:inline-block">${esc(s.category || '')}</span>
    </div>
  `).join('');

  grid.querySelectorAll('.admin-skill-card').forEach(card => {
    const id = parseInt(card.dataset.skillId);
    const nameInput = card.querySelector('[data-field="name"]');
    const levelInput = card.querySelector('[data-field="level"]');
    const levelLabel = card.querySelector('.level-label');

    levelInput.addEventListener('input', () => { levelLabel.textContent = levelInput.value + '%'; });

    const save = debounce(async () => {
      const skill = state.skills.find(s => s.id === id);
      const payload = { name: nameInput.value.trim(), category: skill.category, level: parseInt(levelInput.value), icon: skill.icon };
      await api(`/admin/api/skills/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      skill.name = payload.name; skill.level = payload.level;
      toast('تم حفظ المهارة');
    }, 600);

    nameInput.addEventListener('change', save);
    levelInput.addEventListener('change', save);
  });

  grid.querySelectorAll('[data-delete-skill]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.deleteSkill);
      askConfirm('حذف المهارة', 'هل تريد حذف هذه المهارة من القائمة؟', async () => {
        await api(`/admin/api/skills/${id}`, { method: 'DELETE' });
        state.skills = state.skills.filter(s => s.id !== id);
        renderSkillsGrid();
        toast('تم حذف المهارة');
      });
    });
  });
}

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

async function loadSkills() {
  const data = await api('/admin/api/skills');
  state.skills = data.skills;
  renderSkillsGrid();
}

document.getElementById('addSkillBtn').addEventListener('click', () => {
  document.getElementById('sf_icon').value = '';
  document.getElementById('sf_name').value = '';
  document.getElementById('sf_category').value = '';
  document.getElementById('sf_level').value = 80;
  document.getElementById('sf_level_label').textContent = '80%';
  openModal('skillModal');
});
document.getElementById('sf_level').addEventListener('input', e => {
  document.getElementById('sf_level_label').textContent = e.target.value + '%';
});
document.getElementById('saveSkillBtn').addEventListener('click', async () => {
  const name = document.getElementById('sf_name').value.trim();
  if (!name) { toast('اسم المهارة مطلوب', 'error'); return; }
  const payload = {
    name,
    category: document.getElementById('sf_category').value.trim() || 'other',
    level: parseInt(document.getElementById('sf_level').value),
    icon: document.getElementById('sf_icon').value.trim() || '⭐',
  };
  await api('/admin/api/skills', { method: 'POST', body: JSON.stringify(payload) });
  closeModal('skillModal');
  toast('تمت إضافة المهارة');
  await loadSkills();
});

// ─── ORDERS ──────────────────────────────────────

function renderOrdersTable() {
  let list = state.orders;
  if (state.orderFilter !== 'all') list = list.filter(o => o.status === state.orderFilter);
  if (state.orderQuery) {
    const q = state.orderQuery.toLowerCase();
    list = list.filter(o => (o.buyer_name + ' ' + o.title).toLowerCase().includes(q));
  }

  const body = document.getElementById('ordersTableBody');
  const empty = document.getElementById('ordersEmpty');
  if (!list.length) { body.innerHTML = ''; empty.style.display = 'block'; return; }
  empty.style.display = 'none';

  const payMap = { cash: '💵 كاش', card: '💳 بطاقة', transfer: '📱 تحويل' };

  body.innerHTML = list.map(o => `
    <tr>
      <td class="row-name">${esc(o.title)}</td>
      <td>
        <div class="row-name">${esc(o.buyer_name)}</div>
        <div class="row-sub">${esc(o.buyer_email)}</div>
      </td>
      <td class="cell-muted">${payMap[o.payment_method] || o.payment_method}</td>
      <td class="cell-mono">${fmtMoney(o.amount)} د.ل</td>
      <td>
        <select class="status-select st-${o.status}" data-order-id="${o.id}">
          ${Object.entries(STATUS_LABELS).map(([val, label]) => `<option value="${val}" ${o.status === val ? 'selected' : ''}>${label}</option>`).join('')}
        </select>
      </td>
      <td class="cell-muted">${fmtDate(o.created_at)}</td>
    </tr>
  `).join('');

  body.querySelectorAll('select[data-order-id]').forEach(sel => {
    sel.addEventListener('change', async () => {
      const id = parseInt(sel.dataset.orderId);
      const newStatus = sel.value;
      sel.className = `status-select st-${newStatus}`;
      try {
        await api(`/admin/api/orders/${id}`, { method: 'PUT', body: JSON.stringify({ status: newStatus }) });
        const order = state.orders.find(o => o.id === id);
        if (order) order.status = newStatus;
        toast('تم تحديث حالة الطلب');
      } catch (e) {
        toast('فشل التحديث', 'error');
      }
    });
  });
}

async function loadOrders() {
  const data = await api('/admin/api/orders');
  state.orders = data.orders;
  renderOrdersTable();
}

document.getElementById('orderSearch').addEventListener('input', e => {
  state.orderQuery = e.target.value;
  renderOrdersTable();
});
document.querySelectorAll('#orderFilterChips .toolbar-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('#orderFilterChips .toolbar-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    state.orderFilter = chip.dataset.filter;
    renderOrdersTable();
  });
});

// ─── MESSAGES ────────────────────────────────────

function renderMessagesGrid() {
  let list = state.messages;
  if (state.msgFilter === 'unread') list = list.filter(m => !m.is_read);

  const grid = document.getElementById('messagesGrid');
  const empty = document.getElementById('messagesEmpty');
  if (!list.length) { grid.innerHTML = ''; empty.style.display = 'block'; return; }
  empty.style.display = 'none';

  grid.innerHTML = list.map(m => `
    <div class="message-card ${m.is_read ? '' : 'unread'}" data-msg-id="${m.id}">
      <div class="message-avatar">${esc((m.name || '?').charAt(0).toUpperCase())}</div>
      <div class="message-body-wrap">
        <div class="message-top-row">
          <strong>${esc(m.name)}</strong>
          <span class="m-email">${esc(m.email)}</span>
          ${!m.is_read ? '<span class="new-dot"></span>' : ''}
          <span class="m-time">${timeAgo(m.created_at)}</span>
        </div>
        ${m.subject ? `<div class="message-subject">${esc(m.subject)}</div>` : ''}
        <div class="message-text">${esc(m.message)}</div>
      </div>
      <div class="message-actions">
        <button class="icon-btn" data-toggle-read="${m.id}" title="${m.is_read ? 'وضع كغير مقروءة' : 'وضع كمقروءة'}">${m.is_read ? '📭' : '📬'}</button>
        <button class="icon-btn danger" data-delete-msg="${m.id}" title="حذف">🗑️</button>
      </div>
    </div>
  `).join('');

  grid.querySelectorAll('[data-toggle-read]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = parseInt(btn.dataset.toggleRead);
      const msg = state.messages.find(m => m.id === id);
      const newVal = !msg.is_read;
      await api(`/admin/api/messages/${id}`, { method: 'PUT', body: JSON.stringify({ is_read: newVal }) });
      msg.is_read = newVal;
      renderMessagesGrid();
      toast(newVal ? 'تم وضع علامة مقروءة' : 'تم وضع علامة غير مقروءة');
    });
  });
  grid.querySelectorAll('[data-delete-msg]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.deleteMsg);
      askConfirm('حذف الرسالة', 'هل تريد حذف هذه الرسالة نهائياً؟', async () => {
        await api(`/admin/api/messages/${id}`, { method: 'DELETE' });
        state.messages = state.messages.filter(m => m.id !== id);
        renderMessagesGrid();
        toast('تم حذف الرسالة');
      });
    });
  });
}

async function loadMessages() {
  const data = await api('/admin/api/messages');
  state.messages = data.messages;
  renderMessagesGrid();
}

document.querySelectorAll('#msgFilterChips .toolbar-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('#msgFilterChips .toolbar-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    state.msgFilter = chip.dataset.filter;
    renderMessagesGrid();
  });
});

// ─── Global search (simple cross-section quick nav) ──

document.getElementById('globalSearch').addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  const q = e.target.value.trim();
  if (!q) return;
  goToPage('projects');
  document.getElementById('projectSearch').value = q;
  state.projectQuery = q;
  if (state.projects.length) renderProjectsTable(); else loadProjects();
});

// ─── INIT ────────────────────────────────────────

loadOverview();

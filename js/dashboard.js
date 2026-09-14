/**
 * dashboard.js — powers dashboard.html
 */
(function () {
  let view = 'grid';
  let filter = 'all';
  let sort = 'recent';
  let query = '';

  function init() {
    bindCreateButton();
    bindToolbar();
    render();
  }

  function bindCreateButton() {
    document.getElementById('import-resume-input')?.addEventListener('change', handleImportFile);
  }

  function handleImportFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    RTExport.importJSON(file, (data) => {
      const resume = RTStorage.createResume(Object.assign(RTResumeData.createEmptyResume(), data, { name: (data.name || 'Imported Resume') + ' (Imported)' }));
      showToast('Resume imported ✓', 'success');
      location.href = `builder.html?id=${resume.id}`;
    }, () => showToast('File type not supported. Please upload a .json backup.', 'danger'));
  }

  function bindToolbar() {
    document.getElementById('search-input')?.addEventListener('input', (e) => { query = e.target.value.toLowerCase(); render(); });
    document.querySelectorAll('[data-filter]').forEach(btn => btn.addEventListener('click', () => {
      filter = btn.dataset.filter;
      document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      render();
    }));
    document.getElementById('sort-select')?.addEventListener('change', (e) => { sort = e.target.value; render(); });
    document.querySelectorAll('[data-view]').forEach(btn => btn.addEventListener('click', () => {
      view = btn.dataset.view;
      document.querySelectorAll('[data-view]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      render();
    }));
  }

  function getFilteredResumes() {
    let list = RTStorage.getAllResumesArray();
    if (query) list = list.filter(r => r.name.toLowerCase().includes(query));
    if (filter === 'draft') list = list.filter(r => RTResumeData.calculateProgress(r) < 100);
    if (filter === 'completed') list = list.filter(r => RTResumeData.calculateProgress(r) === 100);
    if (filter === 'recent') list = list.filter(r => Date.now() - r.updatedAt < 1000 * 60 * 60 * 24 * 7);

    const sorters = {
      recent: (a, b) => b.updatedAt - a.updatedAt,
      oldest: (a, b) => a.updatedAt - b.updatedAt,
      'name-asc': (a, b) => a.name.localeCompare(b.name),
      'name-desc': (a, b) => b.name.localeCompare(a.name),
      'score-high': (a, b) => RTResumeData.calculateProgress(b) - RTResumeData.calculateProgress(a),
      'score-low': (a, b) => RTResumeData.calculateProgress(a) - RTResumeData.calculateProgress(b)
    };
    return list.sort(sorters[sort] || sorters.recent);
  }

  function render() {
    renderStats();
    renderGrid();
  }

  function renderStats() {
    const all = RTStorage.getAllResumesArray();
    const completed = all.filter(r => RTResumeData.calculateProgress(r) === 100).length;
    const avgScore = all.length ? Math.round(all.reduce((s, r) => s + RTResumeData.calculateProgress(r), 0) / all.length) : 0;
    const last = all[0];
    const el = document.getElementById('stat-grid');
    if (!el) return;
    el.innerHTML = `
      <div class="stat-card"><span>Total Resumes</span><strong>${all.length}</strong></div>
      <div class="stat-card"><span>Completed Resumes</span><strong>${completed}</strong></div>
      <div class="stat-card"><span>Average Completion</span><strong>${avgScore}%</strong></div>
      <div class="stat-card"><span>Last Edited</span><strong style="font-size:16px;">${last ? timeAgo(last.updatedAt) : '—'}</strong></div>
    `;
  }

  function timeAgo(ts) {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return 'Just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  }

  function renderGrid() {
    const el = document.getElementById('resume-grid');
    if (!el) return;
    const list = getFilteredResumes();
    el.classList.toggle('list-view', view === 'list');

    if (!list.length) {
      el.innerHTML = `
        <div class="empty-state dash-cta-empty" style="grid-column:1/-1;">
          <div class="empty-icon">${icon('file-text')}</div>
          <h3>No resumes yet.</h3>
          <p>Create your first professional resume in minutes.</p>
          <button class="btn btn-accent" data-create-resume>Create Resume</button>
        </div>`;
      RTOnboarding.bindCreateButtons();
      return;
    }

    el.innerHTML = list.map(r => {
      const pct = RTResumeData.calculateProgress(r);
      const tpl = rtGetTemplate(r.template);
      return `
      <div class="resume-card" data-resume-card="${r.id}">
        <div class="resume-card-menu">
          <div class="more-menu-wrap">
            <button class="btn-icon" data-open-menu="${r.id}">${icon('more')}</button>
            <div class="more-menu" id="menu-${r.id}">
              <button data-act="edit" data-id="${r.id}">${icon('edit')} Edit</button>
              <button data-act="duplicate" data-id="${r.id}">${icon('copy')} Duplicate</button>
              <button data-act="rename" data-id="${r.id}">${icon('edit')} Rename</button>
              <button data-act="download" data-id="${r.id}">${icon('download')} Download PDF</button>
              <button class="danger" data-act="delete" data-id="${r.id}">${icon('trash')} Delete</button>
            </div>
          </div>
        </div>
        <div class="resume-card-thumb" data-open="${r.id}"><div class="thumb-render" id="thumb-${r.id}"></div></div>
        <div class="resume-card-body">
          <h3>${RTPreview.esc(r.name)}</h3>
          <div class="resume-card-meta"><span>${tpl.name}</span><span>·</span><span>${timeAgo(r.updatedAt)}</span></div>
          <div class="resume-card-progress"><i style="width:${pct}%"></i></div>
          <div class="resume-card-actions">
            <button class="btn btn-outline btn-sm" data-act="edit" data-id="${r.id}">Edit</button>
            <button class="btn btn-ghost btn-sm" data-act="ats" data-id="${r.id}">Check ATS</button>
          </div>
        </div>
      </div>`;
    }).join('');

    list.forEach(r => {
      const holder = document.getElementById(`thumb-${r.id}`);
      if (holder) RTPreview.renderInto(holder, r);
      document.querySelector(`[data-open="${r.id}"]`)?.addEventListener('click', () => location.href = `builder.html?id=${r.id}`);
    });

    el.querySelectorAll('[data-open-menu]').forEach(btn => btn.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.more-menu.open').forEach(m => m.classList.remove('open'));
      document.getElementById('menu-' + btn.dataset.openMenu).classList.toggle('open');
    }));
    document.addEventListener('click', () => document.querySelectorAll('.more-menu.open').forEach(m => m.classList.remove('open')));

    el.querySelectorAll('[data-act]').forEach(btn => btn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleAction(btn.dataset.act, btn.dataset.id);
    }));
  }

  function handleAction(act, id) {
    const resume = RTStorage.getResume(id);
    if (act === 'edit') location.href = `builder.html?id=${id}`;
    if (act === 'ats') location.href = `ats-checker.html?id=${id}`;
    if (act === 'download') RTExport.downloadPDF(resume);
    if (act === 'duplicate') { RTStorage.duplicateResume(id); showToast('Resume duplicated ✓', 'success'); render(); }
    if (act === 'rename') openModal({
      title: 'Rename resume', input: { label: 'Resume name', value: resume.name }, confirmText: 'Save',
      onConfirm: (val) => { if (val) { RTStorage.renameResume(id, val); showToast('Renamed'); render(); } }
    });
    if (act === 'delete') openModal({
      title: 'Delete this resume?', body: 'This will permanently remove it from this device.', danger: true, confirmText: 'Delete',
      onConfirm: () => { RTStorage.deleteResume(id); showToast('Resume deleted'); render(); }
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();

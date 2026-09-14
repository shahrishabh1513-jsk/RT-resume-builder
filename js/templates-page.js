/**
 * templates-page.js — powers templates.html (the template gallery)
 */
document.addEventListener('DOMContentLoaded', () => {
  const grid = document.getElementById('template-grid');
  if (!grid) return;

  const sample = RTSampleData.getSampleResume();
  let activeFilter = 'all';

  function renderGrid() {
    const list = activeFilter === 'all' ? RT_TEMPLATES : RT_TEMPLATES.filter(t => t.category === activeFilter);
    grid.innerHTML = list.map(t => `
      <div class="template-card">
        <div class="template-thumb" data-preview="${t.id}">
          ${t.ats ? `<span class="badge badge-success ats-tag">${icon('check-circle')} ATS-friendly</span>` : ''}
          <div class="thumb-render" id="tpl-thumb-${t.id}"></div>
        </div>
        <div class="template-info">
          <div class="t-top"><h3>${t.name}</h3><span class="t-cat">${t.category}</span></div>
          <p style="font-size:13px;margin:0;">${t.description}</p>
          <div class="template-actions">
            <button class="btn btn-outline btn-sm" data-preview="${t.id}">Preview</button>
            <button class="btn btn-accent btn-sm" data-use="${t.id}">Use Template</button>
          </div>
        </div>
      </div>
    `).join('');

    list.forEach(t => {
      const holder = document.getElementById(`tpl-thumb-${t.id}`);
      const previewResume = Object.assign({}, sample, { template: t.id });
      RTPreview.renderInto(holder, previewResume);
    });

    grid.querySelectorAll('[data-preview]').forEach(el => el.addEventListener('click', () => openPreview(el.dataset.preview)));
    grid.querySelectorAll('[data-use]').forEach(btn => btn.addEventListener('click', () => useTemplate(btn.dataset.use)));
  }

  function openPreview(templateId) {
    const t = rtGetTemplate(templateId);
    const previewResume = Object.assign({}, sample, { template: templateId });
    openModal({
      title: t.name,
      body: `<div style="max-height:60vh;overflow:auto;border:1px solid var(--line);border-radius:8px;margin-top:10px;background:#525659;padding:20px;display:flex;justify-content:center;">
        <div style="transform:scale(.55);transform-origin:top center;" id="modal-preview-holder"></div>
      </div>`,
      confirmText: 'Use This Template', cancelText: 'Close',
      onConfirm: () => useTemplate(templateId)
    });
    setTimeout(() => {
      const holder = document.getElementById('modal-preview-holder');
      if (holder) RTPreview.renderInto(holder, previewResume);
    }, 0);
  }

  function useTemplate(templateId) {
    const params = new URLSearchParams(location.search);
    const resumeType = params.get('type') || 'general';
    openModal({
      title: 'Name your resume', input: { label: 'Resume name', value: `My ${rtGetTemplate(templateId).name} Resume` },
      confirmText: 'Start Building',
      onConfirm: (name) => {
        const resume = RTStorage.createResume({
          name: name || 'Untitled Resume',
          template: templateId,
          resumeType,
          design: Object.assign(RTResumeData.createEmptyResume().design, {})
        });
        location.href = `builder.html?id=${resume.id}`;
      }
    });
  }

  document.querySelectorAll('.filter-chip').forEach(chip => chip.addEventListener('click', () => {
    activeFilter = chip.dataset.filter;
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    renderGrid();
  }));

  // Try Sample Resume — populates a full sample resume directly into the builder.
  document.getElementById('try-sample-btn')?.addEventListener('click', () => {
    const resume = RTStorage.createResume(RTSampleData.getSampleResume('modern'));
    resume.name = 'Sample Resume';
    RTStorage.updateResume(resume.id, () => resume);
    location.href = `builder.html?id=${resume.id}`;
  });

  renderGrid();
});

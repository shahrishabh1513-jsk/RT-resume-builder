/**
 * resume-builder.js — the core of the application.
 * Renders the section sidebar, the active section's form, and keeps the
 * live preview in sync on every input/change event (no reloads).
 */

const RTBuilder = (() => {
  let resume = null;
  let activeSection = 'personalInfo';
  let saveTimer = null;
  let historyStack = [];
  let redoStack = [];
  let zoom = 0.62;
  let dragState = null; // { list, fromIndex }

  /* ------------------------------------------------------------------ */
  /* init                                                                */
  /* ------------------------------------------------------------------ */

  function init() {
    const params = new URLSearchParams(location.search);
    const id = params.get('id') || RTStorage.getActiveResumeId();
    resume = id ? RTStorage.getResume(id) : null;

    if (!resume) {
      // Nothing to edit yet — send the person to pick a template first.
      location.href = 'templates.html';
      return;
    }
    RTStorage.setActiveResumeId(resume.id);

    bindHeaderActions();
    bindMobileTabs();
    bindPreviewZoom();
    bindGlobalShortcuts();
    renderAll();
  }

  function snapshot() {
    return JSON.parse(JSON.stringify(resume));
  }

  function pushHistory() {
    historyStack.push(snapshot());
    if (historyStack.length > 40) historyStack.shift();
    redoStack = [];
  }

  function undo() {
    if (!historyStack.length) return;
    redoStack.push(snapshot());
    resume = historyStack.pop();
    renderAll();
    scheduleSave();
    showToast('Undid last change');
  }

  function redo() {
    if (!redoStack.length) return;
    historyStack.push(snapshot());
    resume = redoStack.pop();
    renderAll();
    scheduleSave();
    showToast('Redid change');
  }

  function bindGlobalShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const tag = (document.activeElement.tagName || '').toLowerCase();
      const typing = tag === 'input' || tag === 'textarea';
      if (e.key.toLowerCase() === 'z' && !typing) { e.preventDefault(); undo(); }
      if (e.key.toLowerCase() === 'y' && !typing) { e.preventDefault(); redo(); }
    });
  }

  /* ------------------------------------------------------------------ */
  /* save                                                                */
  /* ------------------------------------------------------------------ */

  function scheduleSave() {
    const statusEl = document.getElementById('save-status');
    if (statusEl) { statusEl.classList.add('saving'); statusEl.querySelector('span').textContent = 'Saving…'; }
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      RTStorage.updateResume(resume.id, () => resume);
      if (statusEl) { statusEl.classList.remove('saving'); statusEl.querySelector('span').textContent = 'Saved'; }
    }, 600);
  }

  /* ------------------------------------------------------------------ */
  /* top-level render                                                    */
  /* ------------------------------------------------------------------ */

  function renderAll() {
    renderHeader();
    renderProgress();
    renderSidebar();
    renderForm();
    renderPreview();
  }

  function renderHeader() {
    const nameInput = document.getElementById('resume-name-input');
    if (nameInput && document.activeElement !== nameInput) nameInput.value = resume.name;
  }

  function renderProgress() {
    const pct = RTResumeData.calculateProgress(resume);
    const bar = document.getElementById('progress-bar-fill');
    const num = document.getElementById('progress-pct');
    if (bar) bar.style.width = pct + '%';
    if (num) num.textContent = pct + '%';
  }

  /* ------------------------------------------------------------------ */
  /* sidebar                                                             */
  /* ------------------------------------------------------------------ */

  function renderSidebar() {
    const el = document.getElementById('sidebar-sections');
    if (!el) return;
    el.innerHTML = RTResumeData.SECTIONS.map(s => {
      const count = RTResumeData.sectionEntryCount(resume, s.id);
      const done = RTResumeData.isSectionComplete(resume, s.id);
      const showCount = !['personalInfo', 'design', 'summary'].includes(s.id);
      return `
        <button class="sidebar-item ${activeSection === s.id ? 'active' : ''}" data-section-nav="${s.id}">
          ${icon(s.icon)}
          <span class="s-name">${s.name}</span>
          ${showCount ? `<span class="s-count">${count}</span>` : `<span class="s-check ${done ? 'done' : ''}"></span>`}
        </button>`;
    }).join('');
    el.querySelectorAll('[data-section-nav]').forEach(btn => {
      btn.addEventListener('click', () => {
        activeSection = btn.dataset.sectionNav;
        renderSidebar();
        renderForm();
        setMobilePanel('edit');
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* form panel dispatch                                                 */
  /* ------------------------------------------------------------------ */

  function renderForm() {
    const el = document.getElementById('form-panel-inner');
    if (!el) return;
    const renderers = {
      personalInfo: renderPersonalInfoForm, summary: renderSummaryForm,
      experience: () => renderListForm('experience', 'Experience', experienceCardHTML, () => RTResumeData.emptyEntry('experience')),
      education: () => renderListForm('education', 'Education', educationCardHTML, () => RTResumeData.emptyEntry('education')),
      skills: renderSkillsForm,
      projects: () => renderListForm('projects', 'Projects', projectCardHTML, () => RTResumeData.emptyEntry('project')),
      certifications: () => renderListForm('certifications', 'Certifications', certCardHTML, () => RTResumeData.emptyEntry('certification')),
      languages: renderLanguagesForm,
      achievements: () => renderListForm('achievements', 'Achievements', achievementCardHTML, () => RTResumeData.emptyEntry('achievement')),
      volunteer: () => renderListForm('volunteer', 'Volunteer Experience', volunteerCardHTML, () => RTResumeData.emptyEntry('volunteer')),
      interests: renderInterestsForm,
      references: renderReferencesForm,
      customSections: renderCustomSectionsForm,
      design: renderDesignForm
    };
    el.innerHTML = '';
    (renderers[activeSection] || (() => ''))();
    bindDelegatedFormEvents();
  }

  function setSectionHTML(html) {
    document.getElementById('form-panel-inner').innerHTML = html;
  }

  /* ------------------------------------------------------------------ */
  /* PERSONAL INFO                                                       */
  /* ------------------------------------------------------------------ */

  function renderPersonalInfoForm() {
    const p = resume.personalInfo;
    setSectionHTML(`
      <h2>Personal Information</h2>
      <p class="section-sub">This appears at the top of every template.</p>
      <div class="photo-upload">
        <div class="photo-preview" id="photo-preview">${p.photo ? `<img src="${p.photo}" alt="">` : icon('user')}</div>
        <div>
          <input type="file" id="photo-file-input" accept="image/*" class="visually-hidden">
          <button class="btn btn-outline btn-sm" id="upload-photo-btn">Upload Photo</button>
          ${p.photo ? `<button class="btn btn-ghost btn-sm" id="remove-photo-btn">Remove</button>` : ''}
          <div class="hint">Optional. Stays on your device — never uploaded anywhere.</div>
        </div>
      </div>
      <div class="field-row">
        <div class="field" data-field="fullName"><label>Full Name</label><input type="text" data-bind="personalInfo.fullName" value="${esc(p.fullName)}" placeholder="Alex Morgan"></div>
        <div class="field" data-field="title"><label>Professional Title</label><input type="text" data-bind="personalInfo.title" value="${esc(p.title)}" placeholder="Frontend Developer"></div>
      </div>
      <div class="field-row">
        <div class="field" data-field="email"><label>Email</label><input type="email" data-bind="personalInfo.email" data-validate="email" value="${esc(p.email)}" placeholder="you@example.com"><div class="error-msg">Please enter a valid email address.</div></div>
        <div class="field" data-field="phone"><label>Phone</label><input type="tel" data-bind="personalInfo.phone" data-validate="phone" value="${esc(p.phone)}" placeholder="+1 555 010 1234"><div class="error-msg">Please enter a valid phone number.</div></div>
      </div>
      <div class="field"><label>Location</label><input type="text" data-bind="personalInfo.location" value="${esc(p.location)}" placeholder="Toronto, Canada"></div>
      <div class="field-row">
        <div class="field" data-field="website"><label>Website</label><input type="text" data-bind="personalInfo.website" data-validate="url" value="${esc(p.website)}" placeholder="yourname.dev"><div class="error-msg">Please enter a valid URL.</div></div>
        <div class="field"><label>LinkedIn</label><input type="text" data-bind="personalInfo.linkedin" value="${esc(p.linkedin)}" placeholder="linkedin.com/in/you"></div>
      </div>
      <div class="field-row">
        <div class="field"><label>GitHub</label><input type="text" data-bind="personalInfo.github" value="${esc(p.github)}" placeholder="github.com/you"></div>
        <div class="field"><label>Portfolio</label><input type="text" data-bind="personalInfo.portfolio" value="${esc(p.portfolio)}" placeholder="Optional"></div>
      </div>
    `);

    document.getElementById('upload-photo-btn').addEventListener('click', () => document.getElementById('photo-file-input').click());
    const removeBtn = document.getElementById('remove-photo-btn');
    if (removeBtn) removeBtn.addEventListener('click', () => { pushHistory(); resume.personalInfo.photo = ''; renderPersonalInfoForm(); renderPreview(); renderSidebar(); scheduleSave(); });
    document.getElementById('photo-file-input').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 3 * 1024 * 1024) { showToast('Image too large. Max 3MB.', 'danger'); return; }
      const reader = new FileReader();
      reader.onload = () => {
        pushHistory();
        resume.personalInfo.photo = reader.result;
        renderPersonalInfoForm(); renderPreview(); renderSidebar(); scheduleSave();
      };
      reader.readAsDataURL(file);
    });
  }

  /* ------------------------------------------------------------------ */
  /* SUMMARY                                                             */
  /* ------------------------------------------------------------------ */

  function renderSummaryForm() {
    const len = resume.summary.length;
    setSectionHTML(`
      <h2>Professional Summary</h2>
      <p class="section-sub">Two to four sentences that frame your experience for this resume.</p>
      <div class="field">
        <textarea id="summary-textarea" rows="7" placeholder="Full stack developer with 5 years of experience...">${esc(resume.summary)}</textarea>
        <div class="char-counter ${len < 50 || len > 400 ? 'warn' : ''}" id="summary-counter">${len} characters — recommended 50–400</div>
      </div>
      <div class="summary-toolbar">
        <button class="btn btn-outline btn-sm" data-sum-action="generate">${icon('sparkle')} Generate Suggestion</button>
        <button class="btn btn-outline btn-sm" data-sum-action="professional">Make Professional</button>
        <button class="btn btn-outline btn-sm" data-sum-action="concise">Make Concise</button>
        <button class="btn btn-outline btn-sm" data-sum-action="improve">Improve Writing</button>
      </div>
      <div class="hint">These are local, rule-based suggestions — not a live AI model. The code is structured so a real AI API can be connected later.</div>
    `);
    const ta = document.getElementById('summary-textarea');
    ta.addEventListener('input', () => {
      resume.summary = ta.value;
      const c = document.getElementById('summary-counter');
      c.textContent = `${ta.value.length} characters — recommended 50–400`;
      c.classList.toggle('warn', ta.value.length < 50 || ta.value.length > 400);
      renderPreview(); renderSidebar(); renderProgress(); scheduleSave();
    });
    ta.addEventListener('blur', () => pushHistory());

    document.querySelectorAll('[data-sum-action]').forEach(btn => btn.addEventListener('click', () => {
      pushHistory();
      resume.summary = RTSuggest.transformSummary(btn.dataset.sumAction, resume.summary, resume.personalInfo.title);
      renderSummaryForm(); renderPreview(); renderSidebar(); renderProgress(); scheduleSave();
    }));
  }

  /* ------------------------------------------------------------------ */
  /* GENERIC LIST FORM (experience / education / projects / certs / achievements / volunteer) */
  /* ------------------------------------------------------------------ */

  function renderListForm(key, label, cardFn, emptyFactory) {
    const list = resume[key];
    setSectionHTML(`
      <h2>${label}</h2>
      <p class="section-sub">Add as many entries as you need. Drag the header to reorder.</p>
      <div id="entry-list" data-list="${key}">
        ${list.map((item, i) => cardFn(item, i, list.length)).join('') || ''}
      </div>
      <button class="add-entry-btn" data-add-list="${key}">${icon('plus')} Add ${label.replace(/s$/, '')}</button>
    `);
    bindListDnD(key);
    bindListActions(key, emptyFactory);
  }

  function entryHeadHTML(key, id, index, total, titleText) {
    return `
      <div class="entry-card-head" draggable="true" data-drag-handle>
        <div class="drag-handle">${icon('grip')} <span>${titleText || 'Entry'}</span></div>
        <div class="entry-card-actions">
          <button class="btn-icon" data-move="up" data-key="${key}" data-id="${id}" ${index === 0 ? 'disabled' : ''} title="Move up">${icon('arrow-up')}</button>
          <button class="btn-icon" data-move="down" data-key="${key}" data-id="${id}" ${index === total - 1 ? 'disabled' : ''} title="Move down">${icon('arrow-down')}</button>
          <button class="btn-icon" data-dup="${key}" data-id="${id}" title="Duplicate">${icon('copy')}</button>
          <button class="btn-icon" data-remove="${key}" data-id="${id}" title="Remove">${icon('trash')}</button>
        </div>
      </div>`;
  }

  function experienceCardHTML(x, i, total) {
    return `
      <div class="entry-card" data-entry-id="${x.id}">
        ${entryHeadHTML('experience', x.id, i, total, x.jobTitle || 'New Experience')}
        <div class="field-row">
          <div class="field"><label>Job Title</label><input data-bind-entry="experience.${x.id}.jobTitle" value="${esc(x.jobTitle)}" placeholder="Frontend Developer"></div>
          <div class="field"><label>Company</label><input data-bind-entry="experience.${x.id}.company" value="${esc(x.company)}" placeholder="Acme Inc."></div>
        </div>
        <div class="field-row">
          <div class="field"><label>Location</label><input data-bind-entry="experience.${x.id}.location" value="${esc(x.location)}" placeholder="Remote"></div>
          <div class="field"><label>Start Date</label><input type="month" data-bind-entry="experience.${x.id}.startDate" value="${esc(x.startDate)}"></div>
        </div>
        <div class="field-row">
          <div class="field"><label>End Date</label><input type="month" data-bind-entry="experience.${x.id}.endDate" value="${esc(x.endDate)}" ${x.current ? 'disabled' : ''}></div>
          <div class="field" style="align-self:end;"><label class="checkbox-row" style="margin:0 0 12px;"><input type="checkbox" data-bind-check="experience.${x.id}.current" ${x.current ? 'checked' : ''}> Current position</label></div>
        </div>
        <div class="field"><label>Description</label><textarea rows="4" data-bind-entry="experience.${x.id}.description" placeholder="One achievement per line works best.">${esc(x.description)}</textarea></div>
        <div data-suggestions-for="${x.id}"></div>
      </div>`;
  }

  function educationCardHTML(x, i, total) {
    return `
      <div class="entry-card" data-entry-id="${x.id}">
        ${entryHeadHTML('education', x.id, i, total, x.degree || 'New Education')}
        <div class="field-row">
          <div class="field"><label>Degree</label><input data-bind-entry="education.${x.id}.degree" value="${esc(x.degree)}" placeholder="B.Sc. in Computer Science"></div>
          <div class="field"><label>Institution</label><input data-bind-entry="education.${x.id}.institution" value="${esc(x.institution)}" placeholder="University of Toronto"></div>
        </div>
        <div class="field-row">
          <div class="field"><label>Location</label><input data-bind-entry="education.${x.id}.location" value="${esc(x.location)}"></div>
          <div class="field"><label>Grade / CGPA</label><input data-bind-entry="education.${x.id}.grade" value="${esc(x.grade)}" placeholder="3.8 GPA"></div>
        </div>
        <div class="field-row">
          <div class="field"><label>Start Date</label><input type="month" data-bind-entry="education.${x.id}.startDate" value="${esc(x.startDate)}"></div>
          <div class="field"><label>End Date</label><input type="month" data-bind-entry="education.${x.id}.endDate" value="${esc(x.endDate)}"></div>
        </div>
        <div class="field"><label>Description</label><textarea rows="3" data-bind-entry="education.${x.id}.description" placeholder="Optional">${esc(x.description)}</textarea></div>
      </div>`;
  }

  function projectCardHTML(x, i, total) {
    return `
      <div class="entry-card" data-entry-id="${x.id}">
        ${entryHeadHTML('projects', x.id, i, total, x.name || 'New Project')}
        <div class="field-row">
          <div class="field"><label>Project Name</label><input data-bind-entry="projects.${x.id}.name" value="${esc(x.name)}"></div>
          <div class="field"><label>Role</label><input data-bind-entry="projects.${x.id}.role" value="${esc(x.role)}" placeholder="Creator"></div>
        </div>
        <div class="field"><label>Description</label><textarea rows="3" data-bind-entry="projects.${x.id}.description">${esc(x.description)}</textarea></div>
        <div class="field"><label>Technologies</label><input data-bind-entry="projects.${x.id}.technologies" value="${esc(x.technologies)}" placeholder="React, Node.js"></div>
        <div class="field-row">
          <div class="field"><label>Project URL</label><input data-bind-entry="projects.${x.id}.url" data-validate="url" value="${esc(x.url)}"><div class="error-msg">Please enter a valid URL.</div></div>
          <div class="field"><label>GitHub URL</label><input data-bind-entry="projects.${x.id}.github" data-validate="url" value="${esc(x.github)}"><div class="error-msg">Please enter a valid URL.</div></div>
        </div>
        <div class="field-row">
          <div class="field"><label>Start Date</label><input type="month" data-bind-entry="projects.${x.id}.startDate" value="${esc(x.startDate)}"></div>
          <div class="field"><label>End Date</label><input type="month" data-bind-entry="projects.${x.id}.endDate" value="${esc(x.endDate)}"></div>
        </div>
      </div>`;
  }

  function certCardHTML(x, i, total) {
    return `
      <div class="entry-card" data-entry-id="${x.id}">
        ${entryHeadHTML('certifications', x.id, i, total, x.name || 'New Certification')}
        <div class="field-row">
          <div class="field"><label>Certification Name</label><input data-bind-entry="certifications.${x.id}.name" value="${esc(x.name)}"></div>
          <div class="field"><label>Organization</label><input data-bind-entry="certifications.${x.id}.organization" value="${esc(x.organization)}"></div>
        </div>
        <div class="field-row">
          <div class="field"><label>Issue Date</label><input type="month" data-bind-entry="certifications.${x.id}.issueDate" value="${esc(x.issueDate)}"></div>
          <div class="field"><label>Credential ID</label><input data-bind-entry="certifications.${x.id}.credentialId" value="${esc(x.credentialId)}"></div>
        </div>
        <div class="field"><label>Credential URL</label><input data-bind-entry="certifications.${x.id}.credentialUrl" data-validate="url" value="${esc(x.credentialUrl)}"><div class="error-msg">Please enter a valid URL.</div></div>
      </div>`;
  }

  function achievementCardHTML(x, i, total) {
    return `
      <div class="entry-card" data-entry-id="${x.id}">
        ${entryHeadHTML('achievements', x.id, i, total, x.title || 'New Achievement')}
        <div class="field-row">
          <div class="field"><label>Achievement</label><input data-bind-entry="achievements.${x.id}.title" value="${esc(x.title)}"></div>
          <div class="field"><label>Organization</label><input data-bind-entry="achievements.${x.id}.organization" value="${esc(x.organization)}"></div>
        </div>
        <div class="field"><label>Date</label><input type="month" data-bind-entry="achievements.${x.id}.date" value="${esc(x.date)}"></div>
        <div class="field"><label>Description</label><textarea rows="3" data-bind-entry="achievements.${x.id}.description">${esc(x.description)}</textarea></div>
      </div>`;
  }

  function volunteerCardHTML(x, i, total) {
    return `
      <div class="entry-card" data-entry-id="${x.id}">
        ${entryHeadHTML('volunteer', x.id, i, total, x.organization || 'New Volunteer Role')}
        <div class="field-row">
          <div class="field"><label>Organization</label><input data-bind-entry="volunteer.${x.id}.organization" value="${esc(x.organization)}"></div>
          <div class="field"><label>Role</label><input data-bind-entry="volunteer.${x.id}.role" value="${esc(x.role)}"></div>
        </div>
        <div class="field-row">
          <div class="field"><label>Start Date</label><input type="month" data-bind-entry="volunteer.${x.id}.startDate" value="${esc(x.startDate)}"></div>
          <div class="field"><label>End Date</label><input type="month" data-bind-entry="volunteer.${x.id}.endDate" value="${esc(x.endDate)}"></div>
        </div>
        <div class="field"><label>Description</label><textarea rows="3" data-bind-entry="volunteer.${x.id}.description">${esc(x.description)}</textarea></div>
      </div>`;
  }

  function bindListActions(key, emptyFactory) {
    document.querySelector(`[data-add-list="${key}"]`).addEventListener('click', () => {
      pushHistory();
      resume[key].push(emptyFactory());
      renderForm(); renderPreview(); renderSidebar(); renderProgress(); scheduleSave();
    });
  }

  function bindListDnD(key) {
    const container = document.getElementById('entry-list');
    if (!container) return;
    container.querySelectorAll('.entry-card').forEach((card, idx) => {
      const handle = card.querySelector('[data-drag-handle]');
      handle.addEventListener('dragstart', (e) => {
        dragState = { key, fromIndex: idx };
        card.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });
      handle.addEventListener('dragend', () => card.classList.remove('dragging'));
      card.addEventListener('dragover', (e) => e.preventDefault());
      card.addEventListener('drop', (e) => {
        e.preventDefault();
        if (!dragState || dragState.key !== key) return;
        pushHistory();
        const arr = resume[key];
        const [moved] = arr.splice(dragState.fromIndex, 1);
        arr.splice(idx, 0, moved);
        dragState = null;
        renderForm(); renderPreview(); scheduleSave();
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* SKILLS                                                              */
  /* ------------------------------------------------------------------ */

  function renderSkillsForm() {
    const cats = ['Programming', 'Web Development', 'Database', 'Tools', 'Frameworks', 'Soft Skills', 'Languages'];
    const levels = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
    const roleMatch = RT_SUGGESTIONS.matchRole(resume.personalInfo.title);
    setSectionHTML(`
      <h2>Skills</h2>
      <p class="section-sub">Group skills by category and rate your level.</p>
      <div id="skills-rows">
        ${resume.skills.map(s => `
          <div class="skill-row" data-skill-id="${s.id}">
            <input data-bind-entry="skills.${s.id}.name" value="${esc(s.name)}" placeholder="Skill name">
            <select data-bind-entry="skills.${s.id}.category">${cats.map(c => `<option ${s.category === c ? 'selected' : ''}>${c}</option>`).join('')}</select>
            <select data-bind-entry="skills.${s.id}.level">${levels.map(l => `<option ${s.level === l ? 'selected' : ''}>${l}</option>`).join('')}</select>
            <button class="btn-icon" data-remove="skills" data-id="${s.id}">${icon('trash')}</button>
          </div>`).join('')}
      </div>
      <button class="add-entry-btn" id="add-skill-btn">${icon('plus')} Add Skill</button>
      ${roleMatch ? `
      <div class="suggestion-box" style="margin-top:18px;">
        <strong style="display:block;margin-bottom:6px;">Suggested for "${esc(resume.personalInfo.title)}"</strong>
        ${roleMatch.skills.map(s => `<div class="sug-item"><span>${esc(s)}</span><button data-quick-skill="${esc(s)}">Add</button></div>`).join('')}
      </div>` : ''}
    `);
    document.getElementById('add-skill-btn').addEventListener('click', () => {
      pushHistory();
      resume.skills.push(RTResumeData.emptyEntry('skill'));
      renderSkillsForm(); renderPreview(); renderSidebar(); scheduleSave();
    });
    document.querySelectorAll('[data-quick-skill]').forEach(btn => btn.addEventListener('click', () => {
      if (resume.skills.some(s => s.name.toLowerCase() === btn.dataset.quickSkill.toLowerCase())) { showToast('Already added'); return; }
      pushHistory();
      const s = RTResumeData.emptyEntry('skill'); s.name = btn.dataset.quickSkill;
      resume.skills.push(s);
      renderSkillsForm(); renderPreview(); renderSidebar(); scheduleSave();
    }));
  }

  /* ------------------------------------------------------------------ */
  /* LANGUAGES                                                           */
  /* ------------------------------------------------------------------ */

  function renderLanguagesForm() {
    const levels = ['Basic', 'Conversational', 'Intermediate', 'Advanced', 'Fluent', 'Native'];
    setSectionHTML(`
      <h2>Languages</h2>
      <p class="section-sub">List the languages you speak and your proficiency.</p>
      <div id="lang-rows">
        ${resume.languages.map(l => `
          <div class="skill-row" style="grid-template-columns:1fr 160px 34px;" data-lang-id="${l.id}">
            <input data-bind-entry="languages.${l.id}.language" value="${esc(l.language)}" placeholder="Language">
            <select data-bind-entry="languages.${l.id}.level">${levels.map(lv => `<option ${l.level === lv ? 'selected' : ''}>${lv}</option>`).join('')}</select>
            <button class="btn-icon" data-remove="languages" data-id="${l.id}">${icon('trash')}</button>
          </div>`).join('')}
      </div>
      <button class="add-entry-btn" id="add-lang-btn">${icon('plus')} Add Language</button>
    `);
    document.getElementById('add-lang-btn').addEventListener('click', () => {
      pushHistory();
      resume.languages.push(RTResumeData.emptyEntry('language'));
      renderLanguagesForm(); renderPreview(); renderSidebar(); scheduleSave();
    });
  }

  /* ------------------------------------------------------------------ */
  /* INTERESTS (tags)                                                    */
  /* ------------------------------------------------------------------ */

  function renderInterestsForm() {
    setSectionHTML(`
      <h2>Interests</h2>
      <p class="section-sub">A short, optional list — press Enter to add.</p>
      <div class="tag-input-wrap" id="interest-tags">
        ${resume.interests.map((t, i) => `<span class="tag-pill">${esc(t)}<button data-remove-tag="${i}">${icon('x')}</button></span>`).join('')}
        <input type="text" id="interest-input" placeholder="Type and press Enter">
      </div>
    `);
    const input = document.getElementById('interest-input');
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && input.value.trim()) {
        e.preventDefault();
        pushHistory();
        resume.interests.push(input.value.trim());
        input.value = '';
        renderInterestsForm(); renderPreview(); renderSidebar(); scheduleSave();
      }
    });
    document.querySelectorAll('[data-remove-tag]').forEach(btn => btn.addEventListener('click', () => {
      pushHistory();
      resume.interests.splice(Number(btn.dataset.removeTag), 1);
      renderInterestsForm(); renderPreview(); renderSidebar(); scheduleSave();
    }));
  }

  /* ------------------------------------------------------------------ */
  /* REFERENCES                                                          */
  /* ------------------------------------------------------------------ */

  function renderReferencesForm() {
    setSectionHTML(`
      <h2>References</h2>
      <label class="checkbox-row"><input type="checkbox" id="hide-refs" ${resume.references.hidden ? 'checked' : ''}> Hide references from resume</label>
      <div id="ref-list">
        ${resume.references.list.map((r, i) => `
          <div class="entry-card" data-entry-id="${r.id}">
            ${entryHeadHTML('references', r.id, i, resume.references.list.length, r.name || 'New Reference')}
            <div class="field-row">
              <div class="field"><label>Name</label><input data-bind-entry="references.list.${r.id}.name" value="${esc(r.name)}"></div>
              <div class="field"><label>Job Title</label><input data-bind-entry="references.list.${r.id}.title" value="${esc(r.title)}"></div>
            </div>
            <div class="field-row">
              <div class="field"><label>Company</label><input data-bind-entry="references.list.${r.id}.company" value="${esc(r.company)}"></div>
              <div class="field"><label>Email</label><input data-bind-entry="references.list.${r.id}.email" data-validate="email" value="${esc(r.email)}"><div class="error-msg">Please enter a valid email address.</div></div>
            </div>
            <div class="field"><label>Phone</label><input data-bind-entry="references.list.${r.id}.phone" value="${esc(r.phone)}"></div>
          </div>`).join('')}
      </div>
      <button class="add-entry-btn" id="add-ref-btn">${icon('plus')} Add Reference</button>
    `);
    document.getElementById('hide-refs').addEventListener('change', (e) => {
      pushHistory();
      resume.references.hidden = e.target.checked;
      renderPreview(); scheduleSave();
    });
    document.getElementById('add-ref-btn').addEventListener('click', () => {
      pushHistory();
      resume.references.list.push(RTResumeData.emptyEntry('reference'));
      renderReferencesForm(); renderPreview(); renderSidebar(); scheduleSave();
    });
  }

  /* ------------------------------------------------------------------ */
  /* CUSTOM SECTIONS                                                     */
  /* ------------------------------------------------------------------ */

  function renderCustomSectionsForm() {
    setSectionHTML(`
      <h2>Custom Sections</h2>
      <p class="section-sub">Add sections like Publications, Courses, Research or Conferences.</p>
      <div id="custom-section-list">
        ${resume.customSections.map(cs => `
          <div class="entry-card">
            <div class="entry-card-head">
              <input data-bind-cs-title="${cs.id}" value="${esc(cs.title)}" style="border:none;background:transparent;font-weight:700;font-size:15px;padding:4px 0;width:70%;">
              <div class="entry-card-actions">
                <button class="btn-icon" data-remove-cs="${cs.id}" title="Remove section">${icon('trash')}</button>
              </div>
            </div>
            ${cs.items.map((it, i) => `
              <div class="entry-card" style="background:var(--paper-dim);box-shadow:none;">
                <div class="entry-card-head" style="margin:0 0 10px;">
                  <div class="drag-handle">${icon('grip')} <span>${it.heading || 'Item'}</span></div>
                  <div class="entry-card-actions">
                    <button class="btn-icon" data-remove-cs-item="${cs.id}.${it.id}" title="Remove item">${icon('trash')}</button>
                  </div>
                </div>
                <div class="field-row">
                  <div class="field"><label>Heading</label><input data-bind-cs-item="${cs.id}.${it.id}.heading" value="${esc(it.heading)}"></div>
                  <div class="field"><label>Subheading</label><input data-bind-cs-item="${cs.id}.${it.id}.subheading" value="${esc(it.subheading)}"></div>
                </div>
                <div class="field"><label>Date</label><input data-bind-cs-item="${cs.id}.${it.id}.date" value="${esc(it.date)}" placeholder="2024"></div>
                <div class="field"><label>Description</label><textarea rows="3" data-bind-cs-item="${cs.id}.${it.id}.description">${esc(it.description)}</textarea></div>
              </div>`).join('')}
            <button class="add-entry-btn" data-add-cs-item="${cs.id}">${icon('plus')} Add Item</button>
          </div>`).join('')}
      </div>
      <button class="add-entry-btn" id="add-cs-btn">${icon('plus')} Add Custom Section</button>
    `);

    document.getElementById('add-cs-btn').addEventListener('click', () => {
      pushHistory();
      const cs = RTResumeData.emptyEntry('customSection');
      resume.customSections.push(cs);
      resume.sectionOrder.push(cs.id);
      renderCustomSectionsForm(); renderPreview(); renderSidebar(); scheduleSave();
    });
    document.querySelectorAll('[data-add-cs-item]').forEach(btn => btn.addEventListener('click', () => {
      pushHistory();
      const cs = resume.customSections.find(c => c.id === btn.dataset.addCsItem);
      cs.items.push(RTResumeData.emptyEntry('customItem'));
      renderCustomSectionsForm(); renderPreview(); scheduleSave();
    }));
    document.querySelectorAll('[data-remove-cs]').forEach(btn => btn.addEventListener('click', () => {
      pushHistory();
      resume.customSections = resume.customSections.filter(c => c.id !== btn.dataset.removeCs);
      resume.sectionOrder = resume.sectionOrder.filter(id => id !== btn.dataset.removeCs);
      renderCustomSectionsForm(); renderPreview(); renderSidebar(); scheduleSave();
    }));
    document.querySelectorAll('[data-remove-cs-item]').forEach(btn => btn.addEventListener('click', () => {
      pushHistory();
      const [csId, itemId] = btn.dataset.removeCsItem.split('.');
      const cs = resume.customSections.find(c => c.id === csId);
      cs.items = cs.items.filter(i => i.id !== itemId);
      renderCustomSectionsForm(); renderPreview(); scheduleSave();
    }));
    document.querySelectorAll('[data-bind-cs-title]').forEach(inp => inp.addEventListener('input', () => {
      const cs = resume.customSections.find(c => c.id === inp.dataset.bindCsTitle);
      cs.title = inp.value;
      renderPreview(); scheduleSave();
    }));
    document.querySelectorAll('[data-bind-cs-item]').forEach(inp => {
      const bindEvt = inp.tagName === 'TEXTAREA' ? 'input' : 'input';
      inp.addEventListener(bindEvt, () => {
        const [csId, itemId, field] = inp.dataset.bindCsItem.split('.');
        const cs = resume.customSections.find(c => c.id === csId);
        const item = cs.items.find(i => i.id === itemId);
        item[field] = inp.value;
        renderPreview(); scheduleSave();
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* DESIGN TAB                                                          */
  /* ------------------------------------------------------------------ */

  function renderDesignForm() {
    const d = resume.design;
    const colors = ['#F2C230', '#C79A12', '#8A6A0A', '#2B2B2B', '#5C5C5C', '#8C6239', '#4F7A2F', '#A83A2C'];
    const fonts = Object.keys(RTPreview.FONT_STACKS);
    const fontLabels = { "'Fraunces', serif": 'Fraunces', "Inter": 'Inter', "Arial": 'Arial', "Calibri": 'Calibri', "Georgia": 'Georgia', "Times New Roman": 'Times New Roman', "Poppins": 'Poppins', "Merriweather": 'Merriweather' };

    setSectionHTML(`
      <h2>Design</h2>
      <p class="section-sub">Changes apply to the live preview instantly.</p>

      <div class="design-group">
        <h4>Template</h4>
        <div class="tpl-picker">
          ${RT_TEMPLATES.map(t => `
            <button class="tpl-pick ${resume.template === t.id ? 'selected' : ''}" data-set-template="${t.id}" title="${t.name}">
              <img src="${t.image}" alt="${t.name} preview" loading="lazy">
              <span>${t.name}</span>
            </button>`).join('')}
        </div>
      </div>

      <div class="design-group">
        <h4>Accent Color</h4>
        <div class="color-swatches">
          ${colors.map(c => `<span class="color-swatch ${d.accentColor === c ? 'selected' : ''}" style="background:${c}" data-set-color="${c}"></span>`).join('')}
          <input type="color" id="custom-color" value="${d.accentColor}" style="width:34px;height:34px;border:none;padding:0;border-radius:50%;cursor:pointer;">
        </div>
      </div>

      <div class="design-group">
        <h4>Font</h4>
        <div class="option-pills">${fonts.map(f => `<button class="option-pill ${d.font === f ? 'selected' : ''}" data-set-font="${f}" style="font-family:${RTPreview.FONT_STACKS[f]}">${fontLabels[f]}</button>`).join('')}</div>
      </div>

      <div class="design-group">
        <h4>Font Size</h4>
        <div class="option-pills">
          ${['small', 'medium', 'large'].map(s => `<button class="option-pill ${d.fontSize === s ? 'selected' : ''}" data-set-fontsize="${s}">${s[0].toUpperCase() + s.slice(1)}</button>`).join('')}
        </div>
      </div>

      <div class="design-group">
        <h4>Spacing</h4>
        <div class="option-pills">
          ${['compact', 'normal', 'comfortable'].map(s => `<button class="option-pill ${d.spacing === s ? 'selected' : ''}" data-set-spacing="${s}">${s[0].toUpperCase() + s.slice(1)}</button>`).join('')}
        </div>
      </div>

      <div class="design-group">
        <h4>Heading Style</h4>
        <div class="option-pills">
          ${['normal', 'bold', 'uppercase', 'underline', 'minimal'].map(s => `<button class="option-pill ${d.headingStyle === s ? 'selected' : ''}" data-set-heading="${s}">${s[0].toUpperCase() + s.slice(1)}</button>`).join('')}
        </div>
      </div>

      <div class="design-group">
        <h4>Margins</h4>
        <div class="option-pills">
          ${['compact', 'normal', 'wide'].map(s => `<button class="option-pill ${d.margins === s ? 'selected' : ''}" data-set-margins="${s}">${s[0].toUpperCase() + s.slice(1)}</button>`).join('')}
        </div>
      </div>

      <div class="design-group">
        <h4>Section Order &amp; Visibility</h4>
        <div id="order-list">
          ${resume.sectionOrder.map(id => {
            const isHidden = resume.hiddenSections.includes(id) || (id === 'references' && resume.references.hidden);
            return `
            <div class="entry-card" style="padding:10px 14px;margin-bottom:8px;" data-order-id="${id}">
              <div class="entry-card-head" draggable="true" data-order-handle style="margin:0;">
                <div class="drag-handle">${icon('grip')} <span style="text-transform:capitalize;">${sectionLabel(id)}</span></div>
                <button class="btn-icon" data-toggle-hidden="${id}" title="${isHidden ? 'Show' : 'Hide'} section">${icon(isHidden ? 'eye' : 'eye')}</button>
              </div>
            </div>`;
          }).join('')}
        </div>
        <div class="hint">Drag to reorder how sections appear on the resume. Empty sections are hidden automatically.</div>
      </div>
    `);

    document.querySelectorAll('[data-set-template]').forEach(b => b.addEventListener('click', () => { pushHistory(); resume.template = b.dataset.setTemplate; renderDesignForm(); renderPreview(); scheduleSave(); }));
    document.querySelectorAll('[data-set-color]').forEach(b => b.addEventListener('click', () => { pushHistory(); resume.design.accentColor = b.dataset.setColor; renderDesignForm(); renderPreview(); scheduleSave(); }));
    document.getElementById('custom-color').addEventListener('input', (e) => { resume.design.accentColor = e.target.value; renderPreview(); scheduleSave(); });
    document.querySelectorAll('[data-set-font]').forEach(b => b.addEventListener('click', () => { pushHistory(); resume.design.font = b.dataset.setFont; renderDesignForm(); renderPreview(); scheduleSave(); }));
    document.querySelectorAll('[data-set-fontsize]').forEach(b => b.addEventListener('click', () => { pushHistory(); resume.design.fontSize = b.dataset.setFontsize; renderDesignForm(); renderPreview(); scheduleSave(); }));
    document.querySelectorAll('[data-set-spacing]').forEach(b => b.addEventListener('click', () => { pushHistory(); resume.design.spacing = b.dataset.setSpacing; renderDesignForm(); renderPreview(); scheduleSave(); }));
    document.querySelectorAll('[data-set-heading]').forEach(b => b.addEventListener('click', () => { pushHistory(); resume.design.headingStyle = b.dataset.setHeading; renderDesignForm(); renderPreview(); scheduleSave(); }));
    document.querySelectorAll('[data-set-margins]').forEach(b => b.addEventListener('click', () => { pushHistory(); resume.design.margins = b.dataset.setMargins; renderDesignForm(); renderPreview(); scheduleSave(); }));
    document.querySelectorAll('[data-toggle-hidden]').forEach(b => b.addEventListener('click', () => {
      pushHistory();
      const id = b.dataset.toggleHidden;
      if (id === 'references') { resume.references.hidden = !resume.references.hidden; }
      else if (resume.hiddenSections.includes(id)) resume.hiddenSections = resume.hiddenSections.filter(x => x !== id);
      else resume.hiddenSections.push(id);
      renderDesignForm(); renderPreview(); renderSidebar(); scheduleSave();
    }));
    bindOrderDnD();
  }

  function sectionLabel(id) {
    const custom = resume.customSections.find(c => c.id === id);
    if (custom) return custom.title;
    const map = { summary: 'Summary', experience: 'Experience', education: 'Education', skills: 'Skills', projects: 'Projects', certifications: 'Certifications', languages: 'Languages', achievements: 'Achievements', volunteer: 'Volunteer', interests: 'Interests', references: 'References' };
    return map[id] || id;
  }

  function bindOrderDnD() {
    const items = document.querySelectorAll('#order-list [data-order-id]');
    items.forEach((el, idx) => {
      const handle = el.querySelector('[data-order-handle]');
      handle.addEventListener('dragstart', (e) => { dragState = { type: 'order', fromIndex: idx }; el.classList.add('dragging'); });
      handle.addEventListener('dragend', () => el.classList.remove('dragging'));
      el.addEventListener('dragover', (e) => e.preventDefault());
      el.addEventListener('drop', (e) => {
        e.preventDefault();
        if (!dragState || dragState.type !== 'order') return;
        pushHistory();
        const [moved] = resume.sectionOrder.splice(dragState.fromIndex, 1);
        resume.sectionOrder.splice(idx, 0, moved);
        dragState = null;
        renderDesignForm(); renderPreview(); scheduleSave();
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* delegated field binding (data-bind, data-bind-entry, data-bind-check, validation) */
  /* ------------------------------------------------------------------ */

  function setDeep(obj, path, value) {
    const parts = path.split('.');
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) cur = cur[parts[i]];
    cur[parts[parts.length - 1]] = value;
  }

  function getEntryTarget(pathStr) {
    // e.g. "experience.<id>.jobTitle"  or "references.list.<id>.name"
    const parts = pathStr.split('.');
    if (parts[0] === 'references') {
      const [, , id, field] = parts;
      return { obj: resume.references.list.find(r => r.id === id), field };
    }
    const [key, id, field] = parts;
    return { obj: resume[key].find(e => e.id === id), field };
  }

  function bindDelegatedFormEvents() {
    const root = document.getElementById('form-panel-inner');

    root.querySelectorAll('[data-bind]').forEach(inp => {
      inp.addEventListener('input', () => {
        setDeep(resume, inp.dataset.bind, inp.value);
        validateField(inp);
        renderPreview(); renderSidebar(); renderProgress(); scheduleSave();
      });
      inp.addEventListener('blur', () => pushHistory());
    });

    root.querySelectorAll('[data-bind-entry]').forEach(inp => {
      inp.addEventListener('input', () => {
        const { obj, field } = getEntryTarget(inp.dataset.bindEntry);
        if (obj) obj[field] = inp.value;
        validateField(inp);
        renderPreview(); renderSidebar(); renderProgress(); scheduleSave();
        if (['jobTitle', 'degree', 'name', 'organization'].includes(field)) updateEntryHeadingLabel(inp);
        if (field === 'jobTitle') updateExperienceSuggestions(inp);
      });
      inp.addEventListener('blur', () => pushHistory());
    });

    root.querySelectorAll('[data-bind-check]').forEach(inp => {
      inp.addEventListener('change', () => {
        pushHistory();
        const { obj, field } = getEntryTarget(inp.dataset.bindCheck);
        if (obj) obj[field] = inp.checked;
        renderForm(); renderPreview(); scheduleSave();
      });
    });

    root.querySelectorAll('[data-move]').forEach(btn => btn.addEventListener('click', () => {
      pushHistory();
      const arr = btn.dataset.key === 'references' ? resume.references.list : resume[btn.dataset.key];
      const idx = arr.findIndex(e => e.id === btn.dataset.id);
      const dir = btn.dataset.move === 'up' ? -1 : 1;
      const swapWith = idx + dir;
      if (swapWith < 0 || swapWith >= arr.length) return;
      [arr[idx], arr[swapWith]] = [arr[swapWith], arr[idx]];
      renderForm(); renderPreview(); scheduleSave();
    }));

    root.querySelectorAll('[data-dup]').forEach(btn => btn.addEventListener('click', () => {
      pushHistory();
      const arr = btn.dataset.dup === 'references' ? resume.references.list : resume[btn.dataset.dup];
      const item = arr.find(e => e.id === btn.dataset.id);
      const copy = JSON.parse(JSON.stringify(item));
      copy.id = RTStorage.uid('e');
      arr.splice(arr.indexOf(item) + 1, 0, copy);
      renderForm(); renderPreview(); renderSidebar(); scheduleSave();
      showToast('Entry duplicated');
    }));

    root.querySelectorAll('[data-remove]').forEach(btn => btn.addEventListener('click', () => {
      pushHistory();
      const key = btn.dataset.remove;
      if (key === 'references') resume.references.list = resume.references.list.filter(e => e.id !== btn.dataset.id);
      else resume[key] = resume[key].filter(e => e.id !== btn.dataset.id);
      renderForm(); renderPreview(); renderSidebar(); renderProgress(); scheduleSave();
    }));
  }

  function updateEntryHeadingLabel(inp) {
    const card = inp.closest('.entry-card');
    if (!card) return;
    const label = card.querySelector('.drag-handle span');
    if (label && inp.value.trim()) label.textContent = inp.value;
  }

  function updateExperienceSuggestions(inp) {
    const card = inp.closest('.entry-card');
    const holder = card.querySelector('[data-suggestions-for]');
    if (!holder) return;
    const match = RT_SUGGESTIONS.matchRole(inp.value);
    holder.innerHTML = match ? `
      <div class="suggestion-box">
        <strong style="display:block;margin-bottom:6px;">Suggested bullet points</strong>
        ${match.bullets.map(b => `<div class="sug-item"><span>${esc(b)}</span><button data-add-bullet="${holder.dataset.suggestionsFor}">Add</button></div>`).join('')}
      </div>` : '';
    holder.querySelectorAll('[data-add-bullet]').forEach(btn => btn.addEventListener('click', () => {
      pushHistory();
      const entry = resume.experience.find(e => e.id === btn.dataset.addBullet);
      const bulletText = btn.previousElementSibling.textContent;
      entry.description = (entry.description ? entry.description + '\n' : '') + bulletText;
      renderForm(); renderPreview(); renderProgress(); scheduleSave();
    }));
  }

  function validateField(inp) {
    const type = inp.dataset.validate;
    if (!type) return;
    const field = inp.closest('.field');
    const val = inp.value.trim();
    let valid = true;
    if (val) {
      if (type === 'email') valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
      if (type === 'phone') valid = /^[+()\d][\d\s().-]{6,}$/.test(val);
      if (type === 'url') valid = /^([a-z]+:\/\/)?[\w-]+(\.[\w-]+)+[/#?]?.*$/i.test(val);
    }
    field.classList.toggle('error', val.length > 0 && !valid);
  }

  function esc(v) { return RTPreview.esc(v); }

  /* ------------------------------------------------------------------ */
  /* preview                                                             */
  /* ------------------------------------------------------------------ */

  function renderPreview() {
    const container = document.getElementById('resume-preview-container');
    if (!container) return;
    RTPreview.renderInto(container, resume);
    updateZoomTransform();
  }

  function bindPreviewZoom() {
    const wrap = document.querySelector('.preview-scale-wrap');
    if (!wrap) return;
    document.getElementById('zoom-out')?.addEventListener('click', () => { zoom = Math.max(0.3, zoom - 0.1); updateZoomTransform(); });
    document.getElementById('zoom-in')?.addEventListener('click', () => { zoom = Math.min(1.3, zoom + 0.1); updateZoomTransform(); });
    document.getElementById('zoom-fit')?.addEventListener('click', () => { zoom = 0.62; updateZoomTransform(); });
  }
  function updateZoomTransform() {
    const wrap = document.querySelector('.preview-scale-wrap');
    const label = document.getElementById('zoom-label');
    if (wrap) wrap.style.transform = `scale(${zoom})`;
    if (label) label.textContent = Math.round(zoom * 100) + '%';
  }

  /* ------------------------------------------------------------------ */
  /* header actions: rename / duplicate / reset / delete / print / download / more menu */
  /* ------------------------------------------------------------------ */

  function bindHeaderActions() {
    const nameInput = document.getElementById('resume-name-input');
    if (nameInput) {
      nameInput.addEventListener('input', () => { resume.name = nameInput.value; scheduleSave(); });
      nameInput.addEventListener('blur', () => pushHistory());
    }

    document.getElementById('undo-btn')?.addEventListener('click', undo);
    document.getElementById('redo-btn')?.addEventListener('click', redo);
    document.getElementById('print-btn')?.addEventListener('click', () => window.print());
    document.getElementById('check-resume-btn')?.addEventListener('click', () => location.href = `ats-checker.html?id=${resume.id}`);
    // Menu open/close toggling for the header dropdowns is handled inline in builder.html
    // (it also owns the click-outside-to-close listener), so this module only wires the
    // individual action buttons inside those menus.

    document.getElementById('action-rename')?.addEventListener('click', () => openModal({
      title: 'Rename resume', input: { label: 'Resume name', value: resume.name }, confirmText: 'Save',
      onConfirm: (val) => { if (val) { resume.name = val; renderHeader(); scheduleSave(); showToast('Renamed'); } }
    }));
    document.getElementById('action-duplicate')?.addEventListener('click', () => {
      const copy = RTStorage.duplicateResume(resume.id);
      showToast('Resume duplicated ✓', 'success');
      location.href = `builder.html?id=${copy.id}`;
    });
    document.getElementById('action-reset')?.addEventListener('click', () => openModal({
      title: 'Reset this resume?', body: 'All content will be cleared. This cannot be undone.', danger: true, confirmText: 'Reset',
      onConfirm: () => {
        const kept = { id: resume.id, name: resume.name, template: resume.template, createdAt: resume.createdAt };
        resume = Object.assign(RTResumeData.createEmptyResume(), kept, { updatedAt: Date.now() });
        renderAll(); scheduleSave(); showToast('Resume reset');
      }
    }));
    document.getElementById('action-delete')?.addEventListener('click', () => openModal({
      title: 'Delete this resume?', body: 'This will permanently remove it from this device.', danger: true, confirmText: 'Delete',
      onConfirm: () => { RTStorage.deleteResume(resume.id); showToast('Resume deleted'); location.href = 'dashboard.html'; }
    }));
    document.getElementById('action-print')?.addEventListener('click', () => window.print());

    document.getElementById('download-pdf')?.addEventListener('click', () => RTExport.downloadPDF(resume));
    document.getElementById('download-txt')?.addEventListener('click', () => RTExport.downloadTXT(resume));
    document.getElementById('download-json')?.addEventListener('click', () => RTExport.downloadJSON(resume));
    document.getElementById('import-json-input')?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      RTExport.importJSON(file, (imported) => {
        pushHistory();
        resume = Object.assign(RTResumeData.createEmptyResume(), imported, { id: resume.id, createdAt: resume.createdAt, updatedAt: Date.now() });
        renderAll(); scheduleSave(); showToast('Resume data imported ✓', 'success');
      }, () => showToast('That file could not be read as resume JSON.', 'danger'));
    });
  }

  /* ------------------------------------------------------------------ */
  /* mobile bottom tabs                                                  */
  /* ------------------------------------------------------------------ */

  function bindMobileTabs() {
    document.querySelectorAll('.mobile-tabs [data-panel]').forEach(btn => {
      btn.addEventListener('click', () => setMobilePanel(btn.dataset.panel));
    });
  }
  function setMobilePanel(panel) {
    document.querySelectorAll('.mobile-tabs [data-panel]').forEach(b => b.classList.toggle('active', b.dataset.panel === panel));
    document.getElementById('builder-sidebar')?.classList.toggle('mobile-active', panel === 'sections');
    document.getElementById('builder-form-panel')?.classList.toggle('mobile-active', panel === 'edit');
    document.getElementById('builder-preview-panel')?.classList.toggle('mobile-active', panel === 'preview');
    if (panel === 'design') { activeSection = 'design'; renderSidebar(); renderForm(); document.getElementById('builder-form-panel')?.classList.add('mobile-active'); }
  }

  return { init, getResume: () => resume };
})();

document.addEventListener('DOMContentLoaded', RTBuilder.init);

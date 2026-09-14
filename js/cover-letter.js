/**
 * cover-letter.js — powers cover-letter.html
 */
const RTCoverLetter = (() => {
  let letter = null;
  let zoom = 0.68;

  const OPENERS = {
    professional: (l) => `I am writing to express my interest in the ${l.jobTitle || 'open'} position at ${l.company || 'your company'}. With a background suited to this role, I am confident I can contribute meaningfully to your team.`,
    friendly: (l) => `I was excited to see the ${l.jobTitle || 'open'} opening at ${l.company || 'your company'} — it lines up closely with the kind of work I enjoy most, and I'd love the chance to bring that energy to your team.`
  };
  const CLOSERS = {
    professional: (l) => `Thank you for considering my application. I would welcome the opportunity to discuss how my background aligns with your team's needs.`,
    friendly: (l) => `Thanks so much for taking the time to read this — I'd love to chat more about how I can help ${l.company || 'the team'} succeed.`
  };
  const BODY = {
    professional: (l) => `In my previous roles, I have developed strong skills that translate directly to this position, including collaborating across teams, solving problems methodically, and delivering consistent results. I am particularly drawn to ${l.company || 'your company'}'s work and believe my experience would let me contribute from day one.`,
    friendly: (l) => `Over the past few years I've built up a mix of hands-on experience and skills that I think would be a great fit here. What draws me to ${l.company || 'your company'} specifically is the chance to work on problems that actually matter to people, and I'd bring the same enthusiasm to this role.`
  };

  function init() {
    const params = new URLSearchParams(location.search);
    const id = params.get('id');
    letter = id ? RTStorage.loadCoverLetters()[id] : RTStorage.getActiveCoverLetter();
    if (!letter) letter = RTStorage.createCoverLetter();

    bindForm();
    bindActions();
    bindZoom();
    render();
  }

  function save() {
    RTStorage.updateCoverLetter(letter.id, () => letter);
  }

  function render() {
    renderForm();
    renderPreview();
  }

  function renderForm() {
    const el = document.getElementById('cl-form');
    if (!el) return;
    el.innerHTML = `
      <div class="field-row">
        <div class="field"><label>Applicant Name</label><input id="cl-name" value="${esc(letter.applicantName)}"></div>
        <div class="field"><label>Job Title You're Applying For</label><input id="cl-jobtitle" value="${esc(letter.jobTitle)}"></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Hiring Manager</label><input id="cl-manager" value="${esc(letter.hiringManager)}" placeholder="Optional"></div>
        <div class="field"><label>Company</label><input id="cl-company" value="${esc(letter.company)}"></div>
      </div>
      <div class="field"><label>Opening Paragraph</label><textarea id="cl-opening" rows="3">${esc(letter.opening)}</textarea></div>
      <div class="field"><label>Body Paragraph</label><textarea id="cl-body" rows="5">${esc(letter.body)}</textarea></div>
      <div class="field"><label>Closing Paragraph</label><textarea id="cl-closing" rows="3">${esc(letter.closing)}</textarea></div>
      <div class="summary-toolbar">
        <button class="btn btn-outline btn-sm" id="cl-generate">${icon('sparkle')} Generate Draft</button>
        <button class="btn btn-outline btn-sm" id="cl-shorten">Shorten</button>
        <button class="btn btn-outline btn-sm" id="cl-professional">Professional Tone</button>
        <button class="btn btn-outline btn-sm" id="cl-friendly">Friendly Tone</button>
        <button class="btn btn-outline btn-sm" id="cl-import">Import From Resume</button>
      </div>
      <div class="hint">Drafts are generated locally from simple templates, not a live AI model.</div>
    `;
    ['name', 'jobtitle', 'manager', 'company'].forEach(f => {
      document.getElementById('cl-' + f).addEventListener('input', (e) => {
        const map = { name: 'applicantName', jobtitle: 'jobTitle', manager: 'hiringManager', company: 'company' };
        letter[map[f]] = e.target.value; renderPreview(); save();
      });
    });
    ['opening', 'body', 'closing'].forEach(f => {
      document.getElementById('cl-' + f).addEventListener('input', (e) => { letter[f] = e.target.value; renderPreview(); save(); });
    });
    document.getElementById('cl-generate').addEventListener('click', () => {
      letter.opening = OPENERS[letter.tone](letter);
      letter.body = BODY[letter.tone](letter);
      letter.closing = CLOSERS[letter.tone](letter);
      render(); save(); showToast('Draft generated');
    });
    document.getElementById('cl-shorten').addEventListener('click', () => {
      ['opening', 'body', 'closing'].forEach(f => {
        const sentences = (letter[f] || '').split(/(?<=[.!?])\s+/);
        letter[f] = sentences.slice(0, 1).join(' ');
      });
      render(); save();
    });
    document.getElementById('cl-professional').addEventListener('click', () => { letter.tone = 'professional'; showToast('Tone set to Professional'); });
    document.getElementById('cl-friendly').addEventListener('click', () => { letter.tone = 'friendly'; showToast('Tone set to Friendly'); });
    document.getElementById('cl-import').addEventListener('click', () => {
      const resume = RTStorage.getActiveResume();
      if (!resume) { showToast('No resume found to import from.', 'warning'); return; }
      letter.applicantName = resume.personalInfo.fullName || letter.applicantName;
      letter.jobTitle = resume.personalInfo.title || letter.jobTitle;
      letter.applicantEmail = resume.personalInfo.email;
      letter.applicantPhone = resume.personalInfo.phone;
      render(); save(); showToast('Imported from your active resume ✓', 'success');
    });
  }

  function renderPreview() {
    const page = document.getElementById('cl-page');
    if (!page) return;
    page.style.setProperty('--r-accent', letter.design.accentColor);
    page.style.setProperty('--r-font', RTPreview.FONT_STACKS[letter.design.font] || letter.design.font);
    const today = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    page.innerHTML = `
      <div style="margin-bottom:22pt;">
        <div class="r-name" style="font-size:1.4em;">${esc(letter.applicantName || 'Your Name')}</div>
        <div class="r-contact">${[letter.applicantEmail, letter.applicantPhone].filter(Boolean).map(x => `<span>${esc(x)}</span>`).join('')}</div>
      </div>
      <p style="margin-bottom:18pt;">${esc(today)}</p>
      ${letter.hiringManager || letter.company ? `<p style="margin-bottom:18pt;">${esc(letter.hiringManager)}${letter.hiringManager && letter.company ? '<br>' : ''}${esc(letter.company)}</p>` : ''}
      <p>${esc(letter.opening) || 'Your opening paragraph will appear here.'}</p>
      <p>${esc(letter.body)}</p>
      <p>${esc(letter.closing)}</p>
      <p style="margin-top:20pt;">Sincerely,<br>${esc(letter.applicantName || 'Your Name')}</p>
    `;
  }

  function bindZoom() {
    document.getElementById('zoom-out')?.addEventListener('click', () => { zoom = Math.max(0.3, zoom - 0.1); applyZoom(); });
    document.getElementById('zoom-in')?.addEventListener('click', () => { zoom = Math.min(1.3, zoom + 0.1); applyZoom(); });
    applyZoom();
  }
  function applyZoom() {
    const wrap = document.querySelector('.preview-scale-wrap');
    if (wrap) wrap.style.transform = `scale(${zoom})`;
    const label = document.getElementById('zoom-label');
    if (label) label.textContent = Math.round(zoom * 100) + '%';
  }

  function bindActions() {
    document.getElementById('cl-download-pdf')?.addEventListener('click', () => {
      if (typeof html2pdf === 'undefined') { showToast('PDF library failed to load.', 'danger'); return; }
      const page = document.getElementById('cl-page');
      html2pdf().set({ margin: 0, filename: `${RTExport.slugify(letter.applicantName || 'cover-letter')}-cover-letter.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } }).from(page).save();
    });
    document.getElementById('cl-print')?.addEventListener('click', () => window.print());
  }

  function esc(v) { return RTPreview.esc(v); }

  return { init };
})();

document.addEventListener('DOMContentLoaded', RTCoverLetter.init);

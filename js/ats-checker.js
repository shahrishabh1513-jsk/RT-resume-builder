/**
 * ats-checker.js
 * A local, simulated ATS-style resume analyzer. This is NOT a real
 * employer applicant-tracking system — it checks common structural and
 * content patterns known to help resumes get parsed and read well.
 */
const RTAts = (() => {

  function resumeText(resume) {
    return [
      resume.summary,
      ...resume.experience.map(x => `${x.jobTitle} ${x.company} ${x.description}`),
      ...resume.projects.map(x => `${x.name} ${x.description} ${x.technologies}`),
      resume.skills.map(s => s.name).join(' '),
      ...resume.education.map(x => `${x.degree} ${x.institution}`)
    ].join(' ').toLowerCase();
  }

  function analyze(resume) {
    const issues = [];
    const p = resume.personalInfo;
    const scores = {};

    /* ---- Contact Information ---- */
    let contact = 100;
    if (!p.email) { contact -= 40; issues.push({ sev: 'danger', cat: 'Contact Information', msg: 'Missing email address.' }); }
    if (!p.phone) { contact -= 25; issues.push({ sev: 'warning', cat: 'Contact Information', msg: 'Missing phone number.' }); }
    if (!p.title) { contact -= 20; issues.push({ sev: 'warning', cat: 'Contact Information', msg: 'Missing professional title.' }); }
    if (!p.location) { contact -= 15; issues.push({ sev: 'warning', cat: 'Contact Information', msg: 'Missing location.' }); }
    scores['Contact Information'] = Math.max(0, contact);

    /* ---- Content (summary) ---- */
    let content = 100;
    if (!resume.summary.trim()) { content -= 50; issues.push({ sev: 'danger', cat: 'Content', msg: 'No professional summary added.' }); }
    else if (resume.summary.length < 50) { content -= 20; issues.push({ sev: 'warning', cat: 'Content', msg: 'Summary is quite short — aim for 50–400 characters.' }); }
    else if (resume.summary.length > 500) { content -= 15; issues.push({ sev: 'warning', cat: 'Content', msg: 'Summary is very long — consider tightening it.' }); }
    scores['Content'] = Math.max(0, content);

    /* ---- Experience ---- */
    let exp = 100;
    if (resume.experience.length === 0) { exp -= 60; issues.push({ sev: 'danger', cat: 'Experience', msg: 'No work experience added.' }); }
    else {
      const withNumbers = resume.experience.filter(x => /\d/.test(x.description)).length;
      if (withNumbers === 0) { exp -= 25; issues.push({ sev: 'warning', cat: 'Experience', msg: 'Add measurable achievements (numbers, %, or metrics) to your experience.' }); }
      const weak = resume.experience.filter(x => (x.description || '').trim().length < 25).length;
      if (weak > 0) { exp -= 15; issues.push({ sev: 'warning', cat: 'Experience', msg: `${weak} experience ${weak === 1 ? 'entry has a' : 'entries have'} very short or missing description.` }); }
      const missingDates = resume.experience.filter(x => !x.startDate).length;
      if (missingDates > 0) { exp -= 10; issues.push({ sev: 'warning', cat: 'Experience', msg: 'Some experience entries are missing a start date, which can look inconsistent.' }); }
    }
    scores['Experience'] = Math.max(0, exp);

    /* ---- Education ---- */
    let edu = 100;
    if (resume.education.length === 0) { edu -= 60; issues.push({ sev: 'danger', cat: 'Education', msg: 'No education added.' }); }
    scores['Education'] = Math.max(0, edu);

    /* ---- Skills ---- */
    let skills = 100;
    if (resume.skills.length === 0) { skills -= 70; issues.push({ sev: 'danger', cat: 'Skills', msg: 'No skills added.' }); }
    else if (resume.skills.length < 4) { skills -= 25; issues.push({ sev: 'warning', cat: 'Skills', msg: 'Add a few more skills — aim for at least 5.' }); }
    scores['Skills'] = Math.max(0, skills);

    /* ---- Formatting ---- */
    let formatting = 100;
    if (resume.customSections.some(c => !c.title.trim())) { formatting -= 15; issues.push({ sev: 'warning', cat: 'Formatting', msg: 'A custom section is missing a name.' }); }
    if (RTResumeData.visibleSections(resume).length === 0) { formatting -= 40; issues.push({ sev: 'danger', cat: 'Formatting', msg: 'Your resume has no visible content sections yet.' }); }
    scores['Formatting'] = Math.max(0, formatting);

    /* ---- Readability ---- */
    let readability = 100;
    const longSentences = (resume.summary.match(/[^.!?]+[.!?]/g) || []).filter(s => s.split(' ').length > 40).length;
    if (longSentences > 0) { readability -= 15; issues.push({ sev: 'warning', cat: 'Readability', msg: 'Your summary has a very long sentence — shorter sentences scan better.' }); }
    scores['Readability'] = Math.max(0, readability);

    const overall = Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / Object.keys(scores).length);

    return { overall, categories: scores, issues };
  }

  function matchKeywords(resume, keywordsRaw) {
    const keywords = keywordsRaw.split(',').map(k => k.trim()).filter(Boolean);
    if (!keywords.length) return null;
    const text = resumeText(resume);
    const matched = [];
    const missing = [];
    keywords.forEach(k => {
      (text.includes(k.toLowerCase()) ? matched : missing).push(k);
    });
    return { total: keywords.length, matched, missing };
  }

  return { analyze, matchKeywords };
})();

/* ---------------- page wiring for ats-checker.html ---------------- */
document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('ats-root');
  if (!root) return;

  const params = new URLSearchParams(location.search);
  const id = params.get('id') || RTStorage.getActiveResumeId();
  const resume = id ? RTStorage.getResume(id) : null;

  if (!resume) {
    root.innerHTML = `<div class="empty-state"><div class="empty-icon">${icon('file-text')}</div><h3>No resume to analyze yet.</h3><p>Create a resume first, then come back to check its score.</p><a class="btn btn-accent" href="templates.html">Create Resume</a></div>`;
    return;
  }

  document.getElementById('ats-resume-name').textContent = resume.name;
  const result = RTAts.analyze(resume);
  renderScore(result.overall);
  renderCategories(result.categories);
  renderIssues(result.issues);
  renderResumeCheck(resume);

  document.getElementById('keyword-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const jobTitle = document.getElementById('target-job').value;
    const kw = document.getElementById('target-keywords').value;
    const match = RTAts.matchKeywords(resume, kw);
    renderKeywordResult(match, jobTitle);
  });

  function renderScore(score) {
    const circumference = 2 * Math.PI * 62;
    const offset = circumference - (score / 100) * circumference;
    document.getElementById('score-ring-holder').innerHTML = `
      <div class="score-ring" style="width:150px;height:150px;">
        <svg viewBox="0 0 140 140"><circle class="track" cx="70" cy="70" r="62"/><circle class="fill" cx="70" cy="70" r="62" style="stroke-dasharray:${circumference};stroke-dashoffset:${offset}"/></svg>
        <div class="score-num"><strong>${score}</strong><span>OUT OF 100</span></div>
      </div>`;
  }

  function renderCategories(categories) {
    document.getElementById('category-list').innerHTML = Object.entries(categories).map(([name, score]) => `
      <li><span>${name}</span><strong style="color:${score >= 80 ? 'var(--success)' : score >= 50 ? 'var(--warning)' : 'var(--danger)'}">${score}</strong></li>
    `).join('');
  }

  function renderIssues(issues) {
    const el = document.getElementById('issue-list');
    if (!issues.length) { el.innerHTML = `<div class="resume-check-item ok">${icon('check-circle')} No issues found — nice work!</div>`; return; }
    el.innerHTML = issues.map(i => `
      <div class="resume-check-item ${i.sev === 'danger' ? 'warn' : 'warn'}">
        ${icon(i.sev === 'danger' ? 'alert-circle' : 'alert-circle')}
        <div><strong style="display:block;font-size:12px;color:var(--muted);">${i.cat}</strong>${i.msg}</div>
      </div>`).join('');
  }

  function renderResumeCheck(resume) {
    const checks = [
      ['Contact information complete', !!(resume.personalInfo.email && resume.personalInfo.phone)],
      ['Professional summary added', resume.summary.trim().length > 0],
      ['Experience added', resume.experience.length > 0],
      ['Education added', resume.education.length > 0],
      ['Skills added', resume.skills.length > 0],
      ['Measurable achievements included', resume.experience.some(x => /\d/.test(x.description))]
    ];
    document.getElementById('resume-check-list').innerHTML = checks.map(([label, ok]) => `
      <div class="resume-check-item ${ok ? 'ok' : 'warn'}">${icon(ok ? 'check-circle' : 'alert-circle')} ${label}</div>
    `).join('');
  }

  function renderKeywordResult(match, jobTitle) {
    const el = document.getElementById('keyword-result');
    if (!match) { el.innerHTML = `<p class="hint">Add a few comma-separated keywords above to check your match.</p>`; return; }
    el.innerHTML = `
      <p><strong>Keyword Match${jobTitle ? ' for ' + RTPreview.esc(jobTitle) : ''}:</strong> ${match.matched.length} / ${match.total}</p>
      ${match.missing.length ? `<p>Missing: ${match.missing.map(RTPreview.esc).join(', ')}</p><p class="hint">Consider weaving these into your summary, skills or experience where genuinely true.</p>` : `<p class="hint">Great — your resume mentions every target keyword.</p>`}
    `;
  }
});

/**
 * resume-preview.js
 * Turns the single shared resumeData object into resume markup.
 * Used by: builder.html (live preview), templates.html (thumbnails),
 * dashboard.html (card thumbnails), pdf-export.js (what gets printed).
 *
 * IMPORTANT: every piece of user-entered text is passed through esc()
 * before being placed in innerHTML — never raw innerHTML of user input.
 */

const RTPreview = (() => {

  function esc(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function nl2ul(text) {
    // Turns lines into bullet points if the user wrote multiple lines,
    // otherwise renders as a plain paragraph.
    const lines = (text || '').split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length > 1) {
      return `<ul>${lines.map(l => `<li>${esc(l)}</li>`).join('')}</ul>`;
    }
    return lines[0] ? `<p style="margin:4pt 0 0;">${esc(lines[0])}</p>` : '';
  }

  function formatDateRange(start, end, current) {
    const fmt = (d) => {
      if (!d) return '';
      const [y, m] = d.split('-');
      if (!m) return y || '';
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return `${months[parseInt(m, 10) - 1] || ''} ${y}`;
    };
    const s = fmt(start);
    const e = current ? 'Present' : fmt(end);
    if (!s && !e) return '';
    return [s, e].filter(Boolean).join(' — ');
  }

  const FONT_STACKS = {
    "'Fraunces', serif": "'Fraunces', Georgia, serif",
    "Inter": "'Inter', sans-serif",
    "Arial": "Arial, Helvetica, sans-serif",
    "Calibri": "Calibri, 'IBM Plex Sans', sans-serif",
    "Georgia": "Georgia, 'Times New Roman', serif",
    "Times New Roman": "'Times New Roman', Times, serif",
    "Poppins": "'Poppins', sans-serif",
    "Merriweather": "'Merriweather', serif"
  };
  const SCALE = { small: 0.92, medium: 1, large: 1.1 };
  const SPACING = { compact: 0.72, normal: 1, comfortable: 1.35 };
  const HEADING_CLASS = { normal: '', uppercase: 'h-uppercase', underline: 'h-underline', minimal: 'h-minimal', bold: 'h-bold' };
  const MARGIN_CLASS = { compact: 'compact', normal: '', wide: 'wide' };

  function sectionTitle(id, resume) {
    const custom = (resume.customSections || []).find(c => c.id === id);
    if (custom) return custom.title;
    const map = {
      summary: 'Summary', experience: 'Experience', education: 'Education', skills: 'Skills',
      projects: 'Projects', certifications: 'Certifications', languages: 'Languages',
      achievements: 'Achievements', volunteer: 'Volunteer Experience', interests: 'Interests', references: 'References'
    };
    return map[id] || id;
  }

  function renderSkills(resume) {
    if (!resume.skills.length) return '';
    const grouped = {};
    resume.skills.forEach(s => { (grouped[s.category] = grouped[s.category] || []).push(s.name); });
    const useTags = resume.template !== 'classic';
    if (useTags) {
      return `<div class="r-skill-tags">${resume.skills.map(s => `<span>${esc(s.name)}</span>`).join('')}</div>`;
    }
    return `<div class="r-skill-plain">${Object.entries(grouped).map(([cat, names]) =>
      `<div><b>${esc(cat)}:</b> ${names.map(esc).join(', ')}</div>`).join('')}</div>`;
  }

  function renderSectionBody(id, resume) {
    switch (id) {
      case 'summary':
        return resume.summary.trim() ? `<p class="r-summary">${esc(resume.summary)}</p>` : '';

      case 'experience':
        return resume.experience.map(x => `
          <div class="r-item">
            <div class="r-item-head">
              <div><div class="r-item-title">${esc(x.jobTitle)}</div><div class="r-item-sub">${esc(x.company)}${x.location ? ' · ' + esc(x.location) : ''}</div></div>
              <div class="r-item-meta">${esc(formatDateRange(x.startDate, x.endDate, x.current))}</div>
            </div>
            <div class="r-item-desc">${nl2ul(x.description)}</div>
          </div>`).join('');

      case 'education':
        return resume.education.map(x => `
          <div class="r-item">
            <div class="r-item-head">
              <div><div class="r-item-title">${esc(x.degree)}</div><div class="r-item-sub">${esc(x.institution)}${x.location ? ' · ' + esc(x.location) : ''}</div></div>
              <div class="r-item-meta">${esc(formatDateRange(x.startDate, x.endDate, false))}</div>
            </div>
            ${x.grade ? `<div class="r-item-desc">Grade: ${esc(x.grade)}</div>` : ''}
            ${x.description ? `<div class="r-item-desc">${nl2ul(x.description)}</div>` : ''}
          </div>`).join('');

      case 'skills':
        return renderSkills(resume);

      case 'projects':
        return resume.projects.map(x => `
          <div class="r-item">
            <div class="r-item-head">
              <div><div class="r-item-title">${esc(x.name)}</div>${x.role ? `<div class="r-item-sub">${esc(x.role)}</div>` : ''}</div>
              <div class="r-item-meta">${esc(formatDateRange(x.startDate, x.endDate, false))}</div>
            </div>
            <div class="r-item-desc">${nl2ul(x.description)}${x.technologies ? `<div style="margin-top:4pt;font-style:italic;">${esc(x.technologies)}</div>` : ''}</div>
          </div>`).join('');

      case 'certifications':
        return resume.certifications.map(x => `
          <div class="r-item">
            <div class="r-item-head">
              <div><div class="r-item-title">${esc(x.name)}</div><div class="r-item-sub">${esc(x.organization)}</div></div>
              <div class="r-item-meta">${esc(formatDateRange(x.issueDate, '', false))}</div>
            </div>
          </div>`).join('');

      case 'languages':
        return `<div class="r-tags">${resume.languages.map(x => `<span>${esc(x.language)} — ${esc(x.level)}</span>`).join('')}</div>`;

      case 'achievements':
        return resume.achievements.map(x => `
          <div class="r-item">
            <div class="r-item-head">
              <div class="r-item-title">${esc(x.title)}${x.organization ? ` · <span class="r-item-sub" style="display:inline;">${esc(x.organization)}</span>` : ''}</div>
              <div class="r-item-meta">${esc(formatDateRange(x.date, '', false))}</div>
            </div>
            ${x.description ? `<div class="r-item-desc">${nl2ul(x.description)}</div>` : ''}
          </div>`).join('');

      case 'volunteer':
        return resume.volunteer.map(x => `
          <div class="r-item">
            <div class="r-item-head">
              <div><div class="r-item-title">${esc(x.role)}</div><div class="r-item-sub">${esc(x.organization)}</div></div>
              <div class="r-item-meta">${esc(formatDateRange(x.startDate, x.endDate, false))}</div>
            </div>
            ${x.description ? `<div class="r-item-desc">${nl2ul(x.description)}</div>` : ''}
          </div>`).join('');

      case 'interests':
        return `<div class="r-tags">${resume.interests.map(x => `<span>${esc(x)}</span>`).join('')}</div>`;

      case 'references':
        if (resume.references.hidden) return '';
        return resume.references.list.map(x => `
          <div class="r-item">
            <div class="r-item-title">${esc(x.name)}</div>
            <div class="r-item-sub">${esc(x.title)}${x.company ? ', ' + esc(x.company) : ''}</div>
            <div class="r-item-meta" style="text-align:left;">${esc(x.email)}${x.phone ? ' · ' + esc(x.phone) : ''}</div>
          </div>`).join('');

      default: {
        const custom = (resume.customSections || []).find(c => c.id === id);
        if (!custom) return '';
        return custom.items.map(x => `
          <div class="r-item">
            <div class="r-item-head">
              <div><div class="r-item-title">${esc(x.heading)}</div>${x.subheading ? `<div class="r-item-sub">${esc(x.subheading)}</div>` : ''}</div>
              <div class="r-item-meta">${esc(x.date)}</div>
            </div>
            ${x.description ? `<div class="r-item-desc">${nl2ul(x.description)}</div>` : ''}
          </div>`).join('');
      }
    }
  }

  function renderSections(resume, idsToRender) {
    return idsToRender.map(id => {
      const body = renderSectionBody(id, resume);
      if (!body) return '';
      return `<div class="r-section"><div class="r-section-title">${esc(sectionTitle(id, resume))}</div>${body}</div>`;
    }).join('');
  }

  function renderContactRow(p) {
    const items = [
      p.email, p.phone, p.location, p.website, p.linkedin, p.github, p.portfolio
    ].filter(Boolean);
    return `<div class="r-contact">${items.map(i => `<span>${esc(i)}</span>`).join('')}</div>`;
  }

  function renderHeaderBlock(resume, withPhoto = true) {
    const p = resume.personalInfo;
    const photo = withPhoto && p.photo ? `<img class="r-photo" src="${p.photo}" alt="">` : '';
    return `
      ${photo ? `<div class="r-header-flex">${photo}<div>` : ''}
      <div class="r-name">${esc(p.fullName || 'Your Name')}</div>
      ${p.title ? `<div class="r-role">${esc(p.title)}</div>` : ''}
      ${renderContactRow(p)}
      ${photo ? `</div></div>` : ''}
    `;
  }

  function visibleOrder(resume) {
    return RTResumeData.visibleSections(resume);
  }

  function renderResumeHTML(resume) {
    const ids = visibleOrder(resume);
    const tpl = resume.template || 'classic';

    if (tpl === 'modern') {
      const sidebarIds = ids.filter(id => ['skills', 'languages', 'interests', 'certifications'].includes(id));
      const mainIds = ids.filter(id => !sidebarIds.includes(id));
      return `
        <div class="r-grid">
          <div class="r-sidebar">
            <div class="r-name">${esc(resume.personalInfo.fullName || 'Your Name')}</div>
            ${resume.personalInfo.title ? `<div class="r-role">${esc(resume.personalInfo.title)}</div>` : ''}
            <div class="r-contact" style="margin-top:10pt;">${[resume.personalInfo.email, resume.personalInfo.phone, resume.personalInfo.location, resume.personalInfo.website, resume.personalInfo.linkedin, resume.personalInfo.github].filter(Boolean).map(i => `<span>${esc(i)}</span>`).join('')}</div>
            <div style="margin-top:16pt;">${renderSections(resume, sidebarIds)}</div>
          </div>
          <div class="r-main">${renderSections(resume, mainIds)}</div>
        </div>`;
    }

    if (tpl === 'executive') {
      return `
        <div class="r-header">
          <div class="r-name">${esc(resume.personalInfo.fullName || 'Your Name')}</div>
          ${resume.personalInfo.title ? `<div class="r-role">${esc(resume.personalInfo.title)}</div>` : ''}
          ${renderContactRow(resume.personalInfo)}
        </div>
        <div class="r-body">${renderSections(resume, ids)}</div>`;
    }

    // classic + minimal share the same simple single-column structure
    return `
      <div class="r-header">${renderHeaderBlock(resume)}</div>
      ${renderSections(resume, ids)}`;
  }

  function applyDesignVars(pageEl, resume) {
    const d = resume.design;
    pageEl.style.setProperty('--r-accent', d.accentColor);
    pageEl.style.setProperty('--r-font', FONT_STACKS[d.font] || d.font);
    pageEl.style.setProperty('--r-scale', SCALE[d.fontSize] ?? 1);
    pageEl.style.setProperty('--r-spacing', SPACING[d.spacing] ?? 1);
    pageEl.className = `resume-page tpl-${resume.template} ${HEADING_CLASS[d.headingStyle] || ''} ${MARGIN_CLASS[d.margins] || ''}`.trim();
  }

  /** Renders the resume into a container element (creates/reuses a .resume-page div inside). */
  function renderInto(container, resume) {
    let page = container.querySelector('.resume-page');
    if (!page) {
      page = document.createElement('div');
      container.innerHTML = '';
      container.appendChild(page);
    }
    applyDesignVars(page, resume);
    page.innerHTML = renderResumeHTML(resume);
    return page;
  }

  return { esc, renderResumeHTML, applyDesignVars, renderInto, FONT_STACKS };
})();

/**
 * pdf-export.js
 * exportPDF() / exportTXT() / exportJSON() / importJSON()
 * PDF export uses html2pdf.js (loaded from CDN in the page's <head>).
 */
const RTExport = (() => {

  function slugify(name) {
    return (name || 'resume').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'resume';
  }

  function downloadPDF(resume) {
    if (typeof html2pdf === 'undefined') {
      showToast('PDF library failed to load — check your internet connection.', 'danger');
      return;
    }
    showToast('Preparing your PDF…');
    const wrapper = document.createElement('div');
    wrapper.style.position = 'fixed';
    wrapper.style.left = '-9999px';
    wrapper.style.top = '0';
    document.body.appendChild(wrapper);
    const page = RTPreview.renderInto(wrapper, resume);
    page.style.boxShadow = 'none';

    const opt = {
      margin: 0,
      filename: `${slugify(resume.name)}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'] }
    };

    html2pdf().set(opt).from(page).save().then(() => {
      wrapper.remove();
      showToast('Download started ✓', 'success');
    }).catch((err) => {
      console.error(err);
      wrapper.remove();
      showToast('Something went wrong generating the PDF. Please try again.', 'danger');
    });
  }

  function plainTextResume(resume) {
    const p = resume.personalInfo;
    const lines = [];
    lines.push((p.fullName || 'YOUR NAME').toUpperCase());
    if (p.title) lines.push(p.title.toUpperCase());
    lines.push([p.email, p.phone, p.location, p.website, p.linkedin, p.github].filter(Boolean).join(' | '));
    lines.push('');

    const section = (title, body) => { if (body && body.trim()) { lines.push(title.toUpperCase()); lines.push(body.trim()); lines.push(''); } };

    section('Summary', resume.summary);

    section('Experience', resume.experience.map(x =>
      `${x.jobTitle} — ${x.company}${x.location ? ', ' + x.location : ''} (${x.startDate || ''} - ${x.current ? 'Present' : (x.endDate || '')})\n${x.description}`
    ).join('\n\n'));

    section('Education', resume.education.map(x =>
      `${x.degree} — ${x.institution}${x.grade ? ', ' + x.grade : ''} (${x.startDate || ''} - ${x.endDate || ''})`
    ).join('\n'));

    section('Skills', resume.skills.map(s => s.name).join(', '));
    section('Projects', resume.projects.map(x => `${x.name}${x.technologies ? ' — ' + x.technologies : ''}\n${x.description}`).join('\n\n'));
    section('Certifications', resume.certifications.map(x => `${x.name} — ${x.organization} (${x.issueDate || ''})`).join('\n'));
    section('Languages', resume.languages.map(x => `${x.language} — ${x.level}`).join(', '));
    section('Achievements', resume.achievements.map(x => `${x.title}${x.organization ? ' — ' + x.organization : ''}`).join('\n'));
    section('Volunteer Experience', resume.volunteer.map(x => `${x.role} — ${x.organization}`).join('\n'));
    section('Interests', resume.interests.join(', '));

    if (!resume.references.hidden) {
      section('References', resume.references.list.map(x => `${x.name}, ${x.title}${x.company ? ', ' + x.company : ''} — ${x.email}`).join('\n'));
    }

    resume.customSections.forEach(cs => {
      section(cs.title, cs.items.map(i => `${i.heading}${i.subheading ? ' — ' + i.subheading : ''}\n${i.description || ''}`).join('\n\n'));
    });

    return lines.join('\n').trim() + '\n';
  }

  function downloadBlob(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  function downloadTXT(resume) {
    downloadBlob(plainTextResume(resume), `${slugify(resume.name)}.txt`, 'text/plain;charset=utf-8');
    showToast('Download started ✓', 'success');
  }

  function downloadJSON(resume) {
    downloadBlob(JSON.stringify(resume, null, 2), `${slugify(resume.name)}.json`, 'application/json');
    showToast('Resume data exported ✓', 'success');
  }

  function importJSON(file, onSuccess, onError) {
    if (!file.name.endsWith('.json')) { onError && onError('not-json'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (typeof data !== 'object') throw new Error('bad shape');
        onSuccess(data);
      } catch (e) {
        onError && onError(e);
      }
    };
    reader.onerror = () => onError && onError('read-error');
    reader.readAsText(file);
  }

  return { downloadPDF, downloadTXT, downloadJSON, importJSON, plainTextResume, slugify };
})();

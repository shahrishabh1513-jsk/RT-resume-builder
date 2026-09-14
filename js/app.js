/**
 * app.js — landing page behavior + shared onboarding entry point.
 * RTOnboarding.promptResumeType() is used by every "Create Resume" button
 * across index.html, templates.html and dashboard.html.
 */
const RTOnboarding = (() => {
  const TYPES = [
    ['general', 'General', 'A balanced resume for most roles.'],
    ['student', 'Student / Fresher', 'Leads with education, projects and skills.'],
    ['internship', 'Internship', 'Highlights coursework and any practical experience.'],
    ['experienced', 'Experienced Professional', 'Leads with work history and impact.'],
    ['career-change', 'Career Change', 'Emphasizes transferable skills.'],
    ['academic', 'Academic', 'Built for research, publications and academic roles.']
  ];

  function promptResumeType(onDone) {
    openModal({
      title: 'What type of resume are you creating?',
      body: `<div class="type-select-grid" id="type-grid" style="margin-top:14px;">
        ${TYPES.map(([id, name, desc]) => `<div class="type-select-card" data-type="${id}"><h4>${name}</h4><p>${desc}</p></div>`).join('')}
      </div>`,
      confirmText: 'Continue', cancelText: 'Cancel',
      onConfirm: () => {
        const selected = document.querySelector('.type-select-card.selected');
        const type = selected ? selected.dataset.type : 'general';
        if (onDone) onDone(type); else location.href = `templates.html?type=${type}`;
      }
    });
    setTimeout(() => {
      document.querySelectorAll('.type-select-card').forEach(card => card.addEventListener('click', () => {
        document.querySelectorAll('.type-select-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
      }));
      document.querySelector('.type-select-card')?.classList.add('selected');
    }, 0);
  }

  function bindCreateButtons() {
    document.querySelectorAll('[data-create-resume]').forEach(btn => {
      btn.addEventListener('click', () => promptResumeType());
    });
  }

  document.addEventListener('DOMContentLoaded', bindCreateButtons);
  return { promptResumeType, bindCreateButtons };
})();

/* ---------------- landing page: mini hero resume typing animation ---------------- */
document.addEventListener('DOMContentLoaded', () => {
  const nameEl = document.getElementById('hero-type-name');
  if (!nameEl) return;
  const text = 'Alex Morgan';
  let i = 0;
  function type() {
    nameEl.textContent = text.slice(0, i);
    i++;
    if (i <= text.length) setTimeout(type, 110);
  }
  type();
});

/**
 * storage.js
 * RT Resume Builder — LocalStorage persistence layer.
 * This is the ONLY module that talks to localStorage directly.
 * Every other module goes through these functions so the storage
 * schema can change in one place (and later be swapped for a real API).
 */

const RT_KEYS = {
  RESUMES: 'rt_resumes',           // { [id]: resumeObject }
  ACTIVE_ID: 'rt_active_resume_id',
  THEME: 'rt_theme',
  COVER_LETTERS: 'rt_cover_letters',
  ACTIVE_COVER_ID: 'rt_active_cover_id',
  SETTINGS: 'rt_settings'
};

const RTStorage = (() => {

  function safeParse(raw, fallback) {
    if (!raw) return fallback;
    try { return JSON.parse(raw); } catch (e) { return fallback; }
  }

  function uid(prefix = 'r') {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  /* ---------------- resumes ---------------- */

  function loadResumes() {
    return safeParse(localStorage.getItem(RT_KEYS.RESUMES), {});
  }

  function saveResumes(resumesMap) {
    try {
      localStorage.setItem(RT_KEYS.RESUMES, JSON.stringify(resumesMap));
      return true;
    } catch (e) {
      console.error('RTStorage.saveResumes failed', e);
      return false;
    }
  }

  function getResume(id) {
    const all = loadResumes();
    return all[id] || null;
  }

  function getAllResumesArray() {
    const all = loadResumes();
    return Object.values(all).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  function createResume(partial = {}) {
    const all = loadResumes();
    const id = uid('res');
    const now = Date.now();
    const resume = Object.assign(RTResumeData.createEmptyResume(), partial, {
      id, createdAt: now, updatedAt: now
    });
    all[id] = resume;
    saveResumes(all);
    setActiveResumeId(id);
    return resume;
  }

  function updateResume(id, updater) {
    const all = loadResumes();
    if (!all[id]) return null;
    const updated = typeof updater === 'function' ? updater(all[id]) : Object.assign({}, all[id], updater);
    updated.updatedAt = Date.now();
    all[id] = updated;
    saveResumes(all);
    return updated;
  }

  function deleteResume(id) {
    const all = loadResumes();
    delete all[id];
    saveResumes(all);
    if (getActiveResumeId() === id) {
      const remaining = Object.keys(all);
      setActiveResumeId(remaining[0] || null);
    }
  }

  function duplicateResume(id) {
    const all = loadResumes();
    const src = all[id];
    if (!src) return null;
    const copy = JSON.parse(JSON.stringify(src));
    copy.id = uid('res');
    copy.name = `${src.name} — Copy`;
    copy.createdAt = Date.now();
    copy.updatedAt = Date.now();
    all[copy.id] = copy;
    saveResumes(all);
    return copy;
  }

  function renameResume(id, newName) {
    return updateResume(id, (r) => Object.assign({}, r, { name: newName }));
  }

  function clearAllData() {
    Object.values(RT_KEYS).forEach(k => localStorage.removeItem(k));
  }

  /* ---------------- active resume pointer ---------------- */

  function getActiveResumeId() {
    return localStorage.getItem(RT_KEYS.ACTIVE_ID);
  }

  function setActiveResumeId(id) {
    if (id) localStorage.setItem(RT_KEYS.ACTIVE_ID, id);
    else localStorage.removeItem(RT_KEYS.ACTIVE_ID);
  }

  function getActiveResume() {
    const id = getActiveResumeId();
    if (!id) return null;
    return getResume(id);
  }

  /* ---------------- cover letters ---------------- */

  function loadCoverLetters() {
    return safeParse(localStorage.getItem(RT_KEYS.COVER_LETTERS), {});
  }
  function saveCoverLetters(map) {
    localStorage.setItem(RT_KEYS.COVER_LETTERS, JSON.stringify(map));
  }
  function createCoverLetter(partial = {}) {
    const all = loadCoverLetters();
    const id = uid('cl');
    const now = Date.now();
    const cl = Object.assign({
      applicantName: '', applicantEmail: '', applicantPhone: '',
      hiringManager: '', company: '', jobTitle: '',
      opening: '', body: '', closing: '',
      tone: 'professional',
      design: { accentColor: '#B9832F', font: "'Fraunces', serif" }
    }, partial, { id, createdAt: now, updatedAt: now });
    all[id] = cl;
    saveCoverLetters(all);
    localStorage.setItem(RT_KEYS.ACTIVE_COVER_ID, id);
    return cl;
  }
  function updateCoverLetter(id, updater) {
    const all = loadCoverLetters();
    if (!all[id]) return null;
    const updated = typeof updater === 'function' ? updater(all[id]) : Object.assign({}, all[id], updater);
    updated.updatedAt = Date.now();
    all[id] = updated;
    saveCoverLetters(all);
    return updated;
  }
  function getActiveCoverLetter() {
    const id = localStorage.getItem(RT_KEYS.ACTIVE_COVER_ID);
    const all = loadCoverLetters();
    return (id && all[id]) || null;
  }

  /* ---------------- theme & settings ---------------- */

  function getTheme() {
    return localStorage.getItem(RT_KEYS.THEME) || 'light';
  }
  function setTheme(theme) {
    localStorage.setItem(RT_KEYS.THEME, theme);
  }

  function getSettings() {
    return safeParse(localStorage.getItem(RT_KEYS.SETTINGS), {
      defaultTemplate: 'classic', defaultFont: "'Fraunces', serif", defaultAccent: '#B9832F'
    });
  }
  function saveSettings(settings) {
    localStorage.setItem(RT_KEYS.SETTINGS, JSON.stringify(settings));
  }

  return {
    uid,
    loadResumes, saveResumes, getResume, getAllResumesArray,
    createResume, updateResume, deleteResume, duplicateResume, renameResume, clearAllData,
    getActiveResumeId, setActiveResumeId, getActiveResume,
    loadCoverLetters, saveCoverLetters, createCoverLetter, updateCoverLetter, getActiveCoverLetter,
    getTheme, setTheme, getSettings, saveSettings
  };
})();

/**
 * resume-data.js
 * The single source of truth for what a "resume" object looks like.
 * Every template in resume-preview.js reads from this same shape —
 * templates never get their own copy of the data.
 */

const RTResumeData = (() => {

  function createEmptyResume() {
    return {
      id: null,
      name: 'Untitled Resume',
      resumeType: 'general', // student | internship | experienced | career-change | academic | general
      template: 'classic',
      design: {
        accentColor: '#B9832F',
        font: "'Fraunces', serif",
        fontSize: 'medium',   // small | medium | large
        spacing: 'normal',    // compact | normal | comfortable
        headingStyle: 'normal', // normal | uppercase | underline | minimal
        margins: 'normal'     // compact | normal | wide
      },
      sectionOrder: ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'languages', 'achievements', 'volunteer', 'interests', 'references'],
      hiddenSections: [],
      personalInfo: {
        fullName: '', title: '', email: '', phone: '', location: '',
        website: '', linkedin: '', github: '', portfolio: '', photo: ''
      },
      summary: '',
      experience: [],
      education: [],
      skills: [],       // {id, name, category, level}
      projects: [],
      certifications: [],
      languages: [],     // {id, language, level}
      achievements: [],
      volunteer: [],
      interests: [],     // array of strings
      references: { hidden: true, list: [] },
      customSections: [], // {id, title, items:[{id,heading,subheading,date,description}]}
      createdAt: null,
      updatedAt: null
    };
  }

  function emptyEntry(type) {
    const id = RTStorage.uid('e');
    switch (type) {
      case 'experience': return { id, jobTitle: '', company: '', location: '', startDate: '', endDate: '', current: false, description: '' };
      case 'education': return { id, degree: '', institution: '', location: '', startDate: '', endDate: '', grade: '', description: '' };
      case 'project': return { id, name: '', role: '', description: '', technologies: '', url: '', github: '', startDate: '', endDate: '' };
      case 'certification': return { id, name: '', organization: '', issueDate: '', credentialId: '', credentialUrl: '' };
      case 'language': return { id, language: '', level: 'Conversational' };
      case 'achievement': return { id, title: '', organization: '', date: '', description: '' };
      case 'volunteer': return { id, organization: '', role: '', startDate: '', endDate: '', description: '' };
      case 'reference': return { id, name: '', title: '', company: '', email: '', phone: '' };
      case 'skill': return { id, name: '', category: 'Programming', level: 'Intermediate' };
      case 'customSection': return { id, title: 'Custom Section', items: [] };
      case 'customItem': return { id, heading: '', subheading: '', date: '', description: '' };
      default: return { id };
    }
  }

  // Registry drives the builder sidebar, in fixed (non-reorderable) order for nav,
  // while sectionOrder above controls the *preview* rendering order for reorderable ones.
  const SECTIONS = [
    { id: 'personalInfo', name: 'Personal Info', icon: 'user', fixed: true },
    { id: 'summary', name: 'Summary', icon: 'file-text' },
    { id: 'experience', name: 'Experience', icon: 'briefcase' },
    { id: 'education', name: 'Education', icon: 'graduation' },
    { id: 'skills', name: 'Skills', icon: 'star' },
    { id: 'projects', name: 'Projects', icon: 'folder' },
    { id: 'certifications', name: 'Certifications', icon: 'award' },
    { id: 'languages', name: 'Languages', icon: 'globe' },
    { id: 'achievements', name: 'Achievements', icon: 'trophy' },
    { id: 'volunteer', name: 'Volunteer', icon: 'heart' },
    { id: 'interests', name: 'Interests', icon: 'compass' },
    { id: 'references', name: 'References', icon: 'users' },
    { id: 'customSections', name: 'Custom Section', icon: 'plus-square' },
    { id: 'design', name: 'Design', icon: 'palette', fixed: true },
  ];

  function sectionEntryCount(resume, sectionId) {
    switch (sectionId) {
      case 'personalInfo': return Object.values(resume.personalInfo).filter(Boolean).length ? 1 : 0;
      case 'summary': return resume.summary && resume.summary.trim().length > 0 ? 1 : 0;
      case 'references': return (resume.references.list || []).length;
      case 'customSections': return (resume.customSections || []).length;
      case 'design': return 0;
      default: {
        if (resume[sectionId] !== undefined) return (resume[sectionId] || []).length;
        const custom = (resume.customSections || []).find(c => c.id === sectionId);
        return custom ? custom.items.length : 0;
      }
    }
  }

  function isSectionComplete(resume, sectionId) {
    switch (sectionId) {
      case 'personalInfo':
        return !!(resume.personalInfo.fullName && resume.personalInfo.email);
      case 'summary':
        return resume.summary.trim().length >= 40;
      case 'experience':
      case 'education':
      case 'skills':
        return resume[sectionId].length > 0;
      default:
        return sectionEntryCount(resume, sectionId) > 0;
    }
  }

  // Weighted completion used for the progress ring/bar in the builder + dashboard.
  const PROGRESS_WEIGHTS = {
    personalInfo: 20, summary: 15, experience: 20, education: 15, skills: 15,
    projects: 8, certifications: 3, languages: 2, achievements: 2
  };

  function calculateProgress(resume) {
    let total = 0, earned = 0;
    Object.entries(PROGRESS_WEIGHTS).forEach(([key, weight]) => {
      total += weight;
      if (isSectionComplete(resume, key)) earned += weight;
    });
    return Math.round((earned / total) * 100);
  }

  function visibleSections(resume) {
    return (resume.sectionOrder || []).filter(id => {
      if ((resume.hiddenSections || []).includes(id)) return false;
      if (id === 'references' && resume.references.hidden) return false;
      return sectionEntryCount(resume, id) > 0 || id === 'summary' && resume.summary.trim();
    });
  }

  return {
    createEmptyResume, emptyEntry, SECTIONS,
    sectionEntryCount, isSectionComplete, calculateProgress, visibleSections
  };
})();

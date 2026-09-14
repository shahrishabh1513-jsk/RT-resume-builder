/**
 * suggestions-data.js
 * Local, rule-based writing suggestions keyed by role. This is NOT an AI API —
 * it is a small local lookup table. The functions in resume-builder.js that
 * call this (generateSummary, generateExperienceBullet, suggestSkills) are
 * written so a real AI API could be dropped in later without changing callers.
 */
const RT_SUGGESTIONS = {
  roles: {
    'frontend developer': {
      summary: 'Frontend developer focused on building fast, accessible interfaces with clean, reusable code. Comfortable turning designs into responsive, cross-browser layouts.',
      bullets: [
        'Developed responsive web interfaces using HTML, CSS and JavaScript.',
        'Collaborated with designers to translate mockups into pixel-accurate, accessible components.',
        'Improved page load performance by optimizing assets and reducing render-blocking scripts.'
      ],
      skills: ['HTML', 'CSS', 'JavaScript', 'React', 'Responsive Design', 'Git']
    },
    'backend developer': {
      summary: 'Backend developer experienced in designing reliable APIs and data models that scale with product growth.',
      bullets: [
        'Designed and maintained REST APIs consumed by web and mobile clients.',
        'Optimized database queries, reducing average response time by double digits.',
        'Implemented authentication and authorization across internal services.'
      ],
      skills: ['Node.js', 'Python', 'SQL', 'REST APIs', 'Docker', 'Git']
    },
    'full stack developer': {
      summary: 'Full stack developer who enjoys owning features end to end, from database schema to polished UI.',
      bullets: [
        'Built full stack features spanning frontend UI and backend services.',
        'Integrated third-party APIs to extend product functionality.',
        'Wrote automated tests to keep releases stable as the codebase grew.'
      ],
      skills: ['JavaScript', 'React', 'Node.js', 'SQL', 'Git', 'REST APIs']
    },
    'data analyst': {
      summary: 'Data analyst experienced in turning raw datasets into clear, actionable reporting for business stakeholders.',
      bullets: [
        'Analyzed large datasets to identify trends and support business decisions.',
        'Built dashboards that gave stakeholders real-time visibility into key metrics.',
        'Automated recurring reports, saving several hours of manual work each week.'
      ],
      skills: ['SQL', 'Excel', 'Python', 'Tableau', 'Data Visualization', 'Statistics']
    },
    'ui/ux designer': {
      summary: 'UI/UX designer focused on research-informed, user-centered design across web and mobile products.',
      bullets: [
        'Conducted user research and usability testing to guide design decisions.',
        'Designed wireframes and high-fidelity prototypes in close collaboration with engineering.',
        'Maintained and extended a shared design system used across product teams.'
      ],
      skills: ['Figma', 'Wireframing', 'User Research', 'Prototyping', 'Design Systems']
    },
    'python developer': {
      summary: 'Python developer with experience building automation tools, APIs and data pipelines.',
      bullets: [
        'Built internal tools and scripts that automated repetitive manual processes.',
        'Developed and maintained REST APIs using Python frameworks.',
        'Wrote unit tests to keep core business logic reliable across releases.'
      ],
      skills: ['Python', 'Django', 'Flask', 'SQL', 'Git', 'REST APIs']
    },
    'java developer': {
      summary: 'Java developer experienced in building maintainable backend services for high-traffic applications.',
      bullets: [
        'Developed backend services in Java supporting core business workflows.',
        'Refactored legacy modules to improve maintainability and test coverage.',
        'Worked closely with QA to reduce production defects release over release.'
      ],
      skills: ['Java', 'Spring Boot', 'SQL', 'REST APIs', 'Git', 'Maven']
    },
    'digital marketing': {
      summary: 'Digital marketing specialist focused on driving growth through data-informed campaigns across paid and organic channels.',
      bullets: [
        'Planned and executed campaigns across paid social, search and email.',
        'Analyzed campaign performance to reallocate budget toward the highest-return channels.',
        'Grew organic traffic through consistent SEO and content improvements.'
      ],
      skills: ['SEO', 'Google Analytics', 'Content Strategy', 'Email Marketing', 'Paid Social']
    },
    'business analyst': {
      summary: 'Business analyst experienced in bridging stakeholders and engineering teams to deliver measurable outcomes.',
      bullets: [
        'Gathered and documented business requirements for cross-functional projects.',
        'Facilitated stakeholder workshops to align on scope and priorities.',
        'Built process documentation that reduced onboarding time for new hires.'
      ],
      skills: ['Requirements Gathering', 'SQL', 'Excel', 'Process Mapping', 'Stakeholder Management']
    },
    'student': {
      summary: 'Motivated student building practical skills through coursework and personal projects, looking for an opportunity to contribute and keep learning.',
      bullets: [
        'Completed coursework in core computer science fundamentals including data structures and algorithms.',
        'Built personal projects to apply classroom concepts to real problems.',
        'Collaborated with classmates on team assignments and presentations.'
      ],
      skills: ['Problem Solving', 'Teamwork', 'Communication', 'Time Management']
    },
    'intern': {
      summary: 'Detail-oriented intern eager to apply academic knowledge to real projects while learning from experienced teammates.',
      bullets: [
        'Assisted the team with day-to-day tasks while learning internal tools and processes.',
        'Completed a project under supervision that was later adopted by the team.',
        'Documented findings and shared them clearly with both technical and non-technical stakeholders.'
      ],
      skills: ['Adaptability', 'Communication', 'Research', 'Microsoft Office']
    }
  },

  matchRole(title) {
    if (!title) return null;
    const t = title.toLowerCase().trim();
    if (this.roles[t]) return this.roles[t];
    const found = Object.keys(this.roles).find(key => t.includes(key) || key.includes(t));
    return found ? this.roles[found] : null;
  }
};

/**
 * RTSuggest — local text transforms for the summary toolbar
 * (generateSummary / improveSummary equivalents). Rule-based only.
 */
const RTSuggest = {
  transformSummary(action, current, title) {
    const match = RT_SUGGESTIONS.matchRole(title);
    switch (action) {
      case 'generate':
        return match ? match.summary : 'Motivated professional with a track record of delivering results and collaborating effectively across teams. Looking to bring that experience to a new role where I can keep growing.';
      case 'professional':
        return this._professionalize(current || (match ? match.summary : ''));
      case 'concise':
        return this._shorten(current);
      case 'improve':
        return this._cleanup(current);
      default:
        return current;
    }
  },
  _cleanup(text) {
    if (!text.trim()) return text;
    let t = text.trim().replace(/\s+/g, ' ');
    t = t.replace(/\bi\b/g, 'I');
    t = t.charAt(0).toUpperCase() + t.slice(1);
    if (!/[.!?]$/.test(t)) t += '.';
    return t;
  },
  _professionalize(text) {
    let t = this._cleanup(text);
    const fillers = [' just ', ' really ', ' very ', ' basically ', ' kind of ', ' sort of '];
    fillers.forEach(f => { t = t.split(f).join(' '); });
    t = t.replace(/\bI'm\b/g, 'I am').replace(/\bI've\b/g, 'I have').replace(/\bdon't\b/g, 'do not');
    return t;
  },
  _shorten(text) {
    const t = this._cleanup(text);
    const sentences = t.split(/(?<=[.!?])\s+/);
    if (sentences.length <= 2) return t.length > 220 ? t.slice(0, 217).trim() + '…' : t;
    return sentences.slice(0, 2).join(' ');
  }
};

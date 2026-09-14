/**
 * templates.js — registry of available resume templates.
 * Rendering itself lives in resume-preview.js; this file just
 * describes each template so gallery/thumbnail UIs can list them.
 */
const RT_TEMPLATES = [
  {
    id: 'classic', name: 'RT Classic', category: 'professional', ats: true,
    description: 'A traditional, centered layout with a clean rule under every heading — safe for any industry.'
  },
  {
    id: 'modern', name: 'RT Modern', category: 'modern', ats: true,
    description: 'An accent-color sidebar keeps contact info, skills and languages visible at a glance.'
  },
  {
    id: 'minimal', name: 'RT Minimal', category: 'minimal', ats: true,
    description: 'Quiet typography and generous whitespace — content does the talking.'
  },
  {
    id: 'executive', name: 'RT Executive', category: 'executive', ats: true,
    description: 'A bold ink header signals seniority; built for leadership and executive roles.'
  }
];

function rtGetTemplate(id) {
  return RT_TEMPLATES.find(t => t.id === id) || RT_TEMPLATES[0];
}

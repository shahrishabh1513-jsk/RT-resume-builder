/**
 * sample-data.js — entirely fictional "Try Sample Resume" content.
 */
const RTSampleData = {
  getSampleResume(baseTemplate = 'modern') {
    const empty = RTResumeData.createEmptyResume();
    return Object.assign(empty, {
      name: 'Full Stack Developer Resume',
      resumeType: 'experienced',
      template: baseTemplate,
      personalInfo: {
        fullName: 'Alex Morgan',
        title: 'Full Stack Developer',
        email: 'alex.morgan@example.com',
        phone: '+1 555 010 1234',
        location: 'Toronto, Canada',
        website: 'alexmorgan.dev',
        linkedin: 'linkedin.com/in/alexmorgan',
        github: 'github.com/alexmorgan',
        portfolio: '',
        photo: ''
      },
      summary: 'Full stack developer with 5 years of experience building responsive web applications using JavaScript, Python and SQL. Focused on writing clean, maintainable code and shipping features that improve conversion and retention.',
      experience: [
        {
          id: RTStorage.uid('e'), jobTitle: 'Senior Frontend Developer', company: 'Northwind Digital',
          location: 'Toronto, Canada', startDate: '2023-02', endDate: '', current: true,
          description: 'Led the redesign of the customer dashboard, cutting page load time by 38% and increasing daily active usage by 22%. Mentored two junior developers and introduced a component library adopted across 4 product teams.'
        },
        {
          id: RTStorage.uid('e'), jobTitle: 'Full Stack Developer', company: 'Harbor Analytics',
          location: 'Remote', startDate: '2020-06', endDate: '2023-01', current: false,
          description: 'Built and maintained REST APIs serving 40k+ daily requests. Migrated legacy jQuery interface to a modern component-based architecture, reducing bug reports by 45%.'
        }
      ],
      education: [
        { id: RTStorage.uid('e'), degree: 'B.Sc. in Computer Science', institution: 'University of Toronto', location: 'Toronto, Canada', startDate: '2016-09', endDate: '2020-05', grade: '3.8 GPA', description: '' }
      ],
      skills: [
        { id: RTStorage.uid('e'), name: 'JavaScript', category: 'Programming', level: 'Expert' },
        { id: RTStorage.uid('e'), name: 'HTML & CSS', category: 'Web Development', level: 'Expert' },
        { id: RTStorage.uid('e'), name: 'Python', category: 'Programming', level: 'Advanced' },
        { id: RTStorage.uid('e'), name: 'SQL', category: 'Database', level: 'Advanced' },
        { id: RTStorage.uid('e'), name: 'Git', category: 'Tools', level: 'Advanced' },
        { id: RTStorage.uid('e'), name: 'React', category: 'Frameworks', level: 'Advanced' }
      ],
      projects: [
        { id: RTStorage.uid('e'), name: 'TaskFlow', role: 'Creator', description: 'A lightweight kanban-style task manager with drag-and-drop boards and offline support.', technologies: 'React, IndexedDB', url: 'taskflow.example.com', github: 'github.com/alexmorgan/taskflow', startDate: '2022-01', endDate: '2022-06' },
        { id: RTStorage.uid('e'), name: 'Portfolio Website', role: 'Designer & Developer', description: 'Personal portfolio and blog built with a static site generator.', technologies: 'HTML, CSS, JavaScript', url: 'alexmorgan.dev', github: '', startDate: '2021-03', endDate: '2021-04' },
        { id: RTStorage.uid('e'), name: 'E-Commerce Platform', role: 'Backend Developer', description: 'Order management and inventory system for a small retail client.', technologies: 'Node.js, PostgreSQL', url: '', github: '', startDate: '2020-08', endDate: '2020-12' }
      ],
      certifications: [
        { id: RTStorage.uid('e'), name: 'AWS Certified Developer – Associate', organization: 'Amazon Web Services', issueDate: '2023-05', credentialId: 'AWS-DEV-88213', credentialUrl: '' }
      ],
      languages: [
        { id: RTStorage.uid('e'), language: 'English', level: 'Native' },
        { id: RTStorage.uid('e'), language: 'French', level: 'Conversational' }
      ],
      achievements: [
        { id: RTStorage.uid('e'), title: 'Hackathon Winner — CityHacks 2022', organization: 'CityHacks', date: '2022-10', description: 'Won first place among 60 teams for an accessibility-focused transit app.' }
      ],
      volunteer: [
        { id: RTStorage.uid('e'), organization: 'Code for Good', role: 'Volunteer Developer', startDate: '2021-01', endDate: '', description: 'Build free websites for local nonprofits.' }
      ],
      interests: ['Coding', 'Photography', 'Hiking', 'Chess'],
      references: { hidden: true, list: [] }
    });
  }
};

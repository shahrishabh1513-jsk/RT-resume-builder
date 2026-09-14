suggestions.json and sample-resume.json are intentionally not here as fetched
JSON: opening index.html directly via file:// blocks fetch() of local JSON in
most browsers (CORS). That data is instead embedded directly as JS objects in
js/suggestions-data.js and js/sample-data.js, which work with zero setup.
templates.json and skills.json above are kept as plain reference data (the
app also has this data embedded in js/templates.js and js/resume-builder.js).

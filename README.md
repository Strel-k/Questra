# Questra

Questra is a browser-based challenge creator and player built as a local-first, no-account app. It supports creating custom challenges, browsing a curated library, importing and exporting .chq files, and playing interactive question formats with all essential data stored in the browser.

## Features

- Create and edit custom challenges
- Support multiple question types: multiple choice, true/false, identification, matching, ordering, and logic puzzle
- Randomize challenge order and configure timers and retries
- Live preview while building a challenge
- Export challenges as `.chq` files using JSON under the hood
- Import previously exported `.chq` files and validate compatibility
- Browse a public library of sample challenges

## Static deployment and local-first architecture

Questra is designed for static hosting and GitHub Pages deployment. It stores challenges, progression, and local backups in the browser and does not require a backend or API keys.

## Run locally

Use any static file server:

```bash
cd "c:\Users\Strelok\Documents\Project"
python -m http.server 8000
```

Then open http://localhost:8000 in your browser.

## Test

```bash
cd "c:\Users\Strelok\Documents\Project"
node --test
```

## GitHub Pages

Build and deploy the project as a static site:

```bash
cd "c:\Users\Strelok\Documents\Project"
python -m http.server 8000
```

Then publish the project folder as a static site on GitHub Pages. No server-side runtime is required.

## File format

The portable challenge file uses the `.chq` extension and stores a JSON object with the following structure:

```json
{
  "version": "1.0",
  "title": "My Challenge",
  "description": "A short challenge description",
  "category": "General Knowledge",
  "instructions": "Answer each question carefully.",
  "settings": {
    "randomizeQuestions": false,
    "revealFeedback": true,
    "allowRetry": false,
    "timerSeconds": 0
  },
  "questions": []
}
```

# kennyserpa.github.io

Professional resume site for Kenny Serpa, a Software Engineer focused on mainframe credit decisioning and modern enterprise integration.

Live site: [https://kennyserpa.github.io/](https://kennyserpa.github.io/)

## Tech stack

- [Vite](https://vitejs.dev/) — build tool and dev server
- [HTML-Validate](https://html-validate.org/) — HTML validation
- [Stylelint](https://stylelint.io/) — CSS linting
- [Prettier](https://prettier.io/) — code formatting
- GitHub Actions — CI/CD and GitHub Pages deployment

## Project structure

```text
.
├── .github/
│   ├── workflows/
│   │   ├── deploy.yml        # Deploy to GitHub Pages on push to main
│   │   └── pr-check.yml      # Lint and build checks for pull requests
│   └── PULL_REQUEST_TEMPLATE.md
├── public/                   # Static assets served at root
│   └── photo.jpg
├── src/
│   ├── css/
│   │   └── main.css          # Site styles
│   ├── js/
│   │   └── main.js           # Mobile nav + scroll spy
│   └── index.html            # Resume markup
├── dist/                     # Build output (generated, gitignored)
├── package.json
├── vite.config.js
└── README.md
```

## Getting started

Requirements: Node.js >= 18

```bash
# Install dependencies
npm install

# Start local dev server
npm run dev

# Lint and format check
npm run validate

# Build for production
npm run build

# Preview the production build
npm run preview
```

## Deployment

The site deploys automatically to GitHub Pages when changes are pushed to `main`.

Required repository settings:

1. Go to **Settings → Pages**.
2. Under **Build and deployment**, select **GitHub Actions** as the source.

## License

© Kenny Serpa. All rights reserved.

# Yuki Tour Planner

A web app for planning restaurant tours in Japan. Browse a curated list of restaurants, build a tour itinerary, reorder stops, and share the tour via URL.

## Features

- **Restaurant catalog** -- restaurant data stored as Markdown files, automatically discovered at build time
- **Tour builder** -- add restaurants from a dropdown, reorder with up/down arrows, remove with one click
- **Shareable URLs** -- tour state is persisted in the URL query parameter (`?tour=id1,id2,id3`), so tours can be shared by copying the link
- **Share button** -- uses the Web Share API where available, falls back to clipboard
- **Dark/light theme** -- toggle between themes, preference saved to `localStorage` and respects system preference on first visit
- **Responsive design** -- mobile-friendly layout using Tailwind CSS

## Tech Stack

- [SolidJS](https://solidjs.com) -- reactive UI framework
- [TypeScript](https://www.typescriptlang.org)
- [Vite](https://vite.dev) -- build tool and dev server
- [Tailwind CSS](https://tailwindcss.com) -- utility-first styling
- [marked](https://marked.js.org) -- Markdown parsing

## Getting Started

```bash
pnpm install
pnpm dev
```

The dev server runs at [http://localhost:5173](http://localhost:5173).

## Scripts

| Script | Description |
|---|---|
| `pnpm dev` | Start the development server |
| `pnpm build` | Type-check and build for production (output in `dist/`) |
| `pnpm preview` | Preview the production build locally |

## Adding a Restaurant

Create a new `.md` file in `src/restaurants/` with a heading and a list of recommended dishes:

```markdown
# Restaurant Name

- Dish one
- Dish two
- Dish three
```

It will be automatically picked up by the app -- no other changes needed.

## Deployment

See the [Vite static deploy guide](https://vite.dev/guide/static-deploy.html) for deployment options.

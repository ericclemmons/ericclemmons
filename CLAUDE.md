# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is Eric Clemmons' personal website/blog built with Astro, deployed on Vercel. It's a server-side rendered site featuring blog posts, portfolio, speaking engagements, and tooling pages.

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview
```

## Tech Stack & Architecture

### Core Framework
- **Astro 4.x** with SSR (server-side rendering) via Vercel adapter
- **Preact** (aliased as React) for interactive components
- **TypeScript** with strict mode
- **Tailwind CSS** with custom typography plugin and Fuchsia color scheme

### Key Integrations
- `@astrojs/mdx` - Blog posts as MDX files
- `@astrojs/sitemap` - Auto-generated sitemap
- `@astrojs/vercel` - Serverless deployment on Vercel
- `satori` + `sharp` - Dynamic OG image generation

### Path Aliases
Import paths use `@/*` alias mapped to `src/*` (configured in tsconfig.json)

## Project Structure

```
src/
├── components/         # Reusable Astro & Preact components
│   ├── Container/     # Layout container components (Outer, Inner)
│   ├── Header/        # Header components including ModeToggle
│   └── *.astro, *.tsx # Mix of Astro and Preact components
├── content/           # Content collections
│   └── blog/          # Blog posts as .mdx files
├── layouts/           # Page layouts
│   ├── Post.astro     # Blog post layout
│   ├── Simple.astro   # Simple page layout
│   └── Spotlight.astro # Hero/spotlight layout for homepage
├── lib/               # Utility functions
│   ├── formatDate.ts  # Date formatting
│   ├── getPosts.ts    # Blog post fetching/sorting
│   └── shader.glsl    # WebGL shader for Canvas component
├── pages/             # File-based routing
│   ├── api/
│   │   └── og.png.ts  # Dynamic OG image endpoint
│   ├── blog/
│   │   ├── [...slug].astro  # Dynamic blog post route
│   │   └── index.astro      # Blog listing page
│   ├── about.astro
│   ├── index.astro    # Homepage
│   ├── projects.astro
│   ├── speaking.astro
│   └── uses.astro
├── fonts/             # Custom Inter font files
└── images/            # Static images
```

## Content Management

### Blog Posts
- Located in `src/content/blog/` as MDX files
- Frontmatter schema defined in `src/content/config.ts`:
  - `title` (required)
  - `date` (required)
  - `summary` (optional, used for SEO/previews)
  - `tags` (array, default: [])
  - `category` (enum: 'astro' | 'webpack', optional)
  - `updated` (optional date)
- Posts are automatically sorted by date (newest first) via `getPosts()` helper
- Dynamic routes: `blog/[...slug].astro` handles all blog post URLs
- MDX components are passed via `@/components/MDX`

### OG Images
- Generated dynamically at `/api/og.png?title=...`
- Uses custom hex loader for font/image assets (see `astro.config.mjs`)
- Satori renders HTML-like syntax to SVG, converted to PNG via sharp
- Includes custom avatar, gradient background, and site branding

## Styling

### Tailwind Configuration
- Custom font sizes with precise line-heights
- Primary color: Fuchsia (via `colors.fuchsia`)
- Dark mode: class-based (`darkMode: 'class'`)
- Typography plugin with extensive prose customization
  - Custom CSS variables for light/dark themes
  - Special styling for links, code, tables, lists, etc.

### Theme System
- `ModeToggle` component in `src/components/Header/ModeToggle.astro`
- Dark mode styles use `.dark` class prefix

## Special Features

### Canvas Component
- WebGL animation in hero section (`src/components/Canvas.astro`)
- Uses Three.js with custom GLSL shader from `src/lib/shader.glsl`
- Positioned absolutely on homepage with clipped background

### Custom Vite Plugin
- `hexLoader` plugin converts binary files (fonts, images) to hex strings
- Enables importing assets with `?raw-hex` query for OG image generation
- Defined in `astro.config.mjs`

## Code Style

### Formatting
Prettier configured with:
- Single quotes
- No semicolons
- Tailwind CSS class sorting plugin

### TypeScript Patterns
- Path aliases: `@/` maps to `src/`
- JSX configured for Preact (`jsxImportSource: "preact"`)
- React imports aliased to `@preact/compat` in package.json

## Deployment

- Deployed to Vercel (serverless)
- Framework auto-detected via `vercel.json`
- Node 18.x required
- Site URL determined by `PUBLIC_VERCEL_URL` env var or localhost fallback
- Image service disabled in Vercel adapter (uses Sharp locally)

## Adding New Blog Posts

1. Create new `.mdx` file in `src/content/blog/`
2. Add required frontmatter (title, date)
3. Write content using MDX syntax
4. Post automatically appears on `/blog` sorted by date
5. OG image auto-generated with title

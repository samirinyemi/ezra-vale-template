# Ezra Vale — Animated Photography Portfolio Template

A fully animated photography portfolio built with Next.js 15, Tailwind v4, GSAP, and Inter.

**Live demo:** https://ezra-vale-photographer-portfolio.vercel.app

This is an open template designed to be cloned, customized with one prompt at a time, and deployed. The images currently in the repo are placeholder editorial photos used for showcase purposes — when you use this for any real work, replace them with your own.

---

## Quick start

### Option 1 — Tell your AI agent

Open Claude Code (or Codex, Cursor, or any agentic coding tool) in an empty folder and paste:

```
Clone https://github.com/samirinyemi/ezra-vale-template into the current folder. Run `npm install` and then `npm run dev`. Once it's running, wait for my instructions to customize it.
```

The agent will clone, install, and start the dev server. Open http://localhost:3000 — the full animated portfolio is live.

### Option 2 — Manually

```bash
git clone https://github.com/samirinyemi/ezra-vale-template
cd ezra-vale-template
npm install
npm run dev
```

Open http://localhost:3000.

---

## Customize after building

Once the site is running locally, you don't need to edit any files yourself. Paste any of the prompts below into your AI agent (in the same session that cloned the repo) and it will update the site for you. Fill in the **[BRACKETED PLACEHOLDERS]** with your own values.

### Change the photographer name and contact

```
Update the site for [YOUR FULL NAME] instead of Ezra Vale. Change the big EZRA VALE wordmark on the home page to [YOUR NAME IN ALL CAPS]. Update the photographer name everywhere it appears — page title, OpenGraph meta, About page heading, contact info. Change the contact email to [your@email.com] and phone to [your phone number].
```

### Change the color palette

```
Change the site's color palette. The page background should be [hex code, e.g. #f5f0e8], heading and wordmark color should be [hex code, e.g. #1a1a1a], and body text color should be [hex code, e.g. #4a4a4a]. Update the design tokens in app/globals.css so every component picks up the new values.
```

### Change the font

```
Swap the typeface from Inter to [Font Name] (a Google Font) across the entire site. Update the @import URL at the top of app/globals.css and replace both Inter references in the :root font-family variables.
```

### Update the About page bio

```
Replace the photographer's bio with these paragraphs:

[Paste your full bio here, one blank line between paragraphs.]

Update both the long version on the About page (the PHOTOGRAPHER.bio array) and the short two-paragraph version that appears next to the headline on the home page (the ABOUT_PARAGRAPHS constant).
```

### Replace the 7 placeholder projects

```
Replace the 7 placeholder projects with mine. Keep the same data structure but use this content:

1. Name: [Project name 1]
   Color: [hex placeholder color, e.g. #a37b48]
   Description: [one-line description shown on the home page]
   Paragraphs (shown on the project detail page):
   - [first paragraph]
   - [second paragraph]
   - [third paragraph, e.g. credits or location]

2. Name: [Project name 2]
   ...

[Repeat for as many projects as you want — the layout adapts to any count.]
```

### Swap in your real photos

```
I've added my photos to public/Images/[project-name]/. Replace the existing image paths for the project named "[exact project name]" with these local file paths:

Cover: /Images/[project-name]/[cover-filename.webp] (dimensions: [W] × [H] pixels)
Gallery, in order:
- /Images/[project-name]/[file-1.webp] ([W] × [H])
- /Images/[project-name]/[file-2.webp] ([W] × [H])
- /Images/[project-name]/[file-3.webp] ([W] × [H])

Update the natW and natH values for each gallery item to match the file's actual pixel dimensions.
```

### Add or remove a project

```
[Add a new project at the end. Name: "[X]". Color: [hex]. Description: "[Y]". Paragraphs: ["...", "...", "..."]. / OR: Remove the project named "[Z]" entirely.] The intro animation, peek cascade, and column scroll adapt automatically.
```

### Tips for getting good results

- **Run one prompt at a time.** Watch the change happen, then run the next one.
- **If something looks off,** describe what's wrong in plain language and ask the model to *explain the problem back* before fixing it. Half the time it diagnoses better than you can.
- Almost all the visible content lives in one file: `components/Intro.tsx`. Anything the model needs is there or in `app/globals.css`.

---

## What's included

- **Next.js 15** with TypeScript, App Router, Tailwind v4
- **GSAP** for animation choreography
- **Inter** loaded from Google Fonts
- **`next/image`** with AVIF / WebP optimization and responsive `srcset`
- **Custom intro animation** — wordmark letter-rise, image rises and flips through projects, peek cascade, infinite scroll column
- **Per-project detail pages** with click-to-open transition and scroll-fade gallery
- **About page** with fade-rise photographer hero images
- **Full menu overlay** with iris-from-click circular reveal
- **Native iOS-style scroll** on mobile with a separate layout (the desktop column is for desktop only)
- **Browser back-button support** through `history.pushState` and a `popstate` listener
- **Responsive optical alignment** — the wordmark visibly aligns to the page gutter, not the invisible text box

---

## Image credit & legal

The placeholder images included in `public/Images/` are intended for educational and demo use only. They are not licensed for commercial use. **When using this template for any real work (a real portfolio, a client site, a paid deployment), replace every image with your own licensed photography.** The customization prompt above (*Swap in your real photos*) shows you how.

---

## Deploy

Push to GitHub and connect the repo to Vercel — that's it. Images are automatically optimized at the edge.

```bash
# After customizing
git init
git add .
git commit -m "Initial commit"
gh repo create my-portfolio --public --source=. --push
# Then open vercel.com and import the repo
```

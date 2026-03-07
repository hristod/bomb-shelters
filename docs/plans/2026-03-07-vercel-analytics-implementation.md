# Vercel Analytics Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Vercel Analytics to track page views and web vitals automatically.

**Architecture:** Install `@vercel/analytics`, add the `<Analytics />` component to the root layout. Vercel handles everything else on deploy.

**Tech Stack:** Next.js 16, React 19, `@vercel/analytics`

---

### Task 1: Install @vercel/analytics

**Step 1: Install the package**

Run: `npm install @vercel/analytics`

**Step 2: Verify installation**

Run: `grep @vercel/analytics package.json`
Expected: `"@vercel/analytics": "^X.X.X"` appears in dependencies

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add @vercel/analytics package"
```

---

### Task 2: Add Analytics component to root layout

**Files:**
- Modify: `src/app/layout.tsx`

**Step 1: Add the Analytics component**

In `src/app/layout.tsx`, add the import and component:

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin", "cyrillic"] });

export const metadata: Metadata = {
  title: "Bomb Shelters Bulgaria | Бомбоубежища България",
  description: "Interactive map of bomb shelters in Bulgaria",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bg">
      <body className={`${inter.className} bg-slate-50 text-slate-700`}>
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
```

Key details:
- Import from `@vercel/analytics/next` (not `@vercel/analytics/react`) — this is the Next.js-specific entry point
- Place `<Analytics />` after `<Providers>` inside `<body>` — it's a standalone component, no context needed

**Step 2: Verify the app builds**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 3: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat: enable Vercel Analytics tracking"
```

# User Feedback via Userback — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Userback SDK integration so users can report problems with shelter entries (from popup) and suggest new shelters (via Userback's widget button).

**Architecture:** Userback JS SDK initialized via a React context provider. Map popup gets a "Report" button that opens Userback's bug form with shelter metadata. Userback's built-in floating widget button handles new shelter suggestions.

**Tech Stack:** Next.js 16, React 19, `@userback/widget` npm package, Leaflet/react-leaflet

---

### Task 1: Install @userback/widget

**Files:**
- Modify: `package.json`

**Step 1: Install the package**

Run: `npm install @userback/widget`

**Step 2: Verify installation**

Run: `grep @userback/widget package.json`
Expected: `"@userback/widget": "^x.x.x"` appears in dependencies

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @userback/widget dependency"
```

---

### Task 2: Create Userback provider and hook

**Files:**
- Create: `src/lib/userback.tsx`

**Step 1: Create the provider**

Create `src/lib/userback.tsx` with this content:

```typescript
"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import UserbackModule from "@userback/widget";
import type { UserbackWidget } from "@userback/widget";

const UserbackContext = createContext<UserbackWidget | null>(null);

export function UserbackProvider({ children }: { children: ReactNode }) {
  const [userback, setUserback] = useState<UserbackWidget | null>(null);

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_USERBACK_TOKEN;
    if (!token) return;
    UserbackModule(token).then(setUserback);
  }, []);

  return (
    <UserbackContext.Provider value={userback}>
      {children}
    </UserbackContext.Provider>
  );
}

export function useUserback() {
  return useContext(UserbackContext);
}
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors (or only pre-existing errors unrelated to this file)

**Step 3: Commit**

```bash
git add src/lib/userback.tsx
git commit -m "feat: add Userback context provider and hook"
```

---

### Task 3: Wire UserbackProvider into the app

**Files:**
- Modify: `src/app/providers.tsx` (7 lines)

**Step 1: Update providers.tsx**

Replace the contents of `src/app/providers.tsx` with:

```typescript
"use client";

import { I18nProvider } from "@/lib/i18n";
import { UserbackProvider } from "@/lib/userback";
import { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <UserbackProvider>{children}</UserbackProvider>
    </I18nProvider>
  );
}
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/app/providers.tsx
git commit -m "feat: wire UserbackProvider into app providers"
```

---

### Task 4: Add translation keys for the report button

**Files:**
- Modify: `src/lib/translations.ts:1-30`

**Step 1: Add the `reportProblem` key**

Add `reportProblem` to both `bg` and `en` objects in `src/lib/translations.ts`:

- In the `bg` object, add: `reportProblem: "Сигнал за грешка",`
- In the `en` object, add: `reportProblem: "Report a problem",`

Add these after the `condition` key in each language block.

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/translations.ts
git commit -m "feat: add reportProblem translation key"
```

---

### Task 5: Add "Report" button to the map popup

**Files:**
- Modify: `src/components/Map.tsx:1-68`

**Step 1: Update Map.tsx**

Make these changes to `src/components/Map.tsx`:

1. Add import for `useUserback` at the top:
   ```typescript
   import { useUserback } from "@/lib/userback";
   ```

2. Inside the `Map` component function (after `const { t } = useI18n();`), add:
   ```typescript
   const userback = useUserback();
   ```

3. Replace the `<Popup>` content (lines 56-63) with:
   ```tsx
   <Popup>
     <div className="text-sm">
       <p className="font-semibold">{shelter.name}</p>
       <p className="text-slate-500">{shelter.address}</p>
       <p className="mt-1">{t("type")}: {shelter.type}</p>
       <p>{t("condition")}: {shelter.category}</p>
       {userback && (
         <button
           className="mt-2 text-xs text-orange-500 hover:text-orange-600 underline cursor-pointer"
           onClick={(e) => {
             e.stopPropagation();
             userback.open("bug", "form", {
               custom_data: {
                 shelter_id: String(shelter.id),
                 shelter_name: shelter.name,
                 shelter_address: shelter.address,
                 shelter_region: shelter.region,
                 lat: String(shelter.lat),
                 lng: String(shelter.lng),
               },
             });
           }}
         >
           {t("reportProblem")}
         </button>
       )}
     </div>
   </Popup>
   ```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

Note: The `userback.open()` call signature may need adjustment based on the actual SDK types. Check the `@userback/widget` type definitions if there are type errors — the API may use `open(type, destination, options)` or `openForm(type, options)`. Adjust accordingly.

**Step 3: Commit**

```bash
git add src/components/Map.tsx
git commit -m "feat: add Report button to shelter map popup"
```

---

### Task 6: Create .env.local with placeholder token

**Files:**
- Create: `.env.local`
- Modify: `.gitignore` (if `.env.local` not already ignored)

**Step 1: Check if .env.local is gitignored**

Run: `grep -q "\.env\.local" .gitignore && echo "already ignored" || echo "needs adding"`

If "needs adding", add `.env.local` to `.gitignore`.

**Step 2: Create .env.local**

Create `.env.local` with:

```
NEXT_PUBLIC_USERBACK_TOKEN=your_userback_access_token_here
```

**Step 3: Create .env.example for documentation**

Create `.env.example` with:

```
NEXT_PUBLIC_USERBACK_TOKEN=your_userback_access_token_here
```

**Step 4: Commit the example file**

```bash
git add .env.example .gitignore
git commit -m "chore: add .env.example with Userback token placeholder"
```

---

### Task 7: Manual smoke test

**No files changed — verification only.**

**Step 1: Start the dev server**

Run: `npm run dev`

**Step 2: Verify the app loads**

Open the app in the browser. The map should render with markers.

**Step 3: Verify popup has Report button**

Click a shelter marker. The popup should show shelter details and a "Report a problem" link below. Without a valid Userback token, the button won't appear (the `userback` instance will be null). To test the button:

1. Sign up for a free Userback account
2. Get the access token (not API token) from the widget settings
3. Set it in `.env.local` and restart the dev server
4. Click a marker, then click "Report a problem" — the Userback bug form should open
5. Verify Userback's floating widget button is visible on the page

**Step 4: Verify the widget button**

The Userback floating widget button should appear in the bottom-right corner. Clicking it should open Userback's feedback form (configured as `feature_request` in the Userback dashboard).

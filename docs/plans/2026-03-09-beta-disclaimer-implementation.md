# Beta Disclaimer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a beta disclaimer banner (persistent, session-dismissible) and a first-visit modal explaining data source and liability.

**Architecture:** A single `BetaDisclaimer.tsx` component renders both the banner and modal. It checks `localStorage` for modal dismissal and `sessionStorage` for banner dismissal. Uses the existing i18n system for translations.

**Tech Stack:** React, Tailwind CSS, localStorage/sessionStorage, existing i18n system.

---

### Task 1: Add translation keys

**Files:**
- Modify: `src/lib/translations.ts`

**Step 1: Add disclaimer-related translation keys**

Add these keys to both `bg` and `en`:

```typescript
export const translations = {
  bg: {
    // ... existing keys ...
    betaBanner: "Бета версия — данните може да съдържат неточности",
    betaModalTitle: "Бета версия",
    betaModalBody: "Данните за местоположенията са базирани на официална информация от МВР. Създателите на сайта не носят отговорност за неточности в локациите. Ако забележите грешка, моля докладвайте я — ще бъде коригирана възможно най-скоро, но може да отнеме време, тъй като проектът се поддържа от един разработчик.",
    betaModalSource: "Източник на данните",
    betaModalDismiss: "Разбрах",
  },
  en: {
    // ... existing keys ...
    betaBanner: "Beta — data may contain inaccuracies",
    betaModalTitle: "Beta version",
    betaModalBody: "Location data is based on official information from the Bulgarian Ministry of Interior (МВР). The website creators are not responsible for inaccurate locations. If you spot an inconsistency, please report it — it will be addressed ASAP, but may take time as this project is maintained by a single developer.",
    betaModalSource: "Data source",
    betaModalDismiss: "Got it",
  },
} as const;
```

**Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 3: Commit**

```bash
git add src/lib/translations.ts
git commit -m "feat: add beta disclaimer translation keys"
```

---

### Task 2: Create BetaDisclaimer component

**Files:**
- Create: `src/components/BetaDisclaimer.tsx`

**Step 1: Create the component**

```tsx
"use client";
import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const MODAL_STORAGE_KEY = "beta-disclaimer-dismissed";
const BANNER_STORAGE_KEY = "beta-banner-dismissed";
const SOURCE_URL =
  "https://mvr.bg/upload/289359/Списък+на+колективни+средства+за+защита.pdf";

export default function BetaDisclaimer() {
  const { t } = useI18n();
  const [showModal, setShowModal] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const modalDismissed = localStorage.getItem(MODAL_STORAGE_KEY);
    if (!modalDismissed) {
      setShowModal(true);
    }
    const bannerDismissed = sessionStorage.getItem(BANNER_STORAGE_KEY);
    if (!bannerDismissed) {
      setShowBanner(true);
    }
  }, []);

  const dismissModal = () => {
    localStorage.setItem(MODAL_STORAGE_KEY, "true");
    setShowModal(false);
  };

  const dismissBanner = () => {
    sessionStorage.setItem(BANNER_STORAGE_KEY, "true");
    setShowBanner(false);
  };

  return (
    <>
      {showBanner && (
        <div className="absolute top-0 left-0 right-0 z-[1001] flex items-center justify-center gap-2 bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-800">
          <span>{t("betaBanner")}</span>
          <button
            onClick={dismissBanner}
            className="ml-auto shrink-0 p-0.5 text-amber-600 hover:text-amber-800 cursor-pointer"
            aria-label="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-[1002] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-slate-800">
              {t("betaModalTitle")}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              {t("betaModalBody")}
            </p>
            <p className="mt-3 text-sm text-slate-600">
              <a
                href={SOURCE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-500 hover:text-orange-600 underline"
              >
                {t("betaModalSource")}
              </a>
            </p>
            <button
              onClick={dismissModal}
              className="mt-5 w-full rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              {t("betaModalDismiss")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
```

**Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 3: Commit**

```bash
git add src/components/BetaDisclaimer.tsx
git commit -m "feat: add BetaDisclaimer component with banner and modal"
```

---

### Task 3: Integrate BetaDisclaimer into the page

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Add BetaDisclaimer to the layout**

Add the import and place it inside the root div, before other elements:

```tsx
"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import { Shelter } from "@/types/shelter";
import { shelters } from "@/lib/shelters";
import LanguageToggle from "@/components/LanguageToggle";
import NavigateButton from "@/components/NavigateButton";
import CenterMapButton from "@/components/CenterMapButton";
import SearchButton from "@/components/SearchButton";
import BetaDisclaimer from "@/components/BetaDisclaimer";

const Map = dynamic(() => import("@/components/Map"), { ssr: false });

export default function Home() {
  const [selectedShelter, setSelectedShelter] = useState<Shelter | null>(null);
  const [flyToLocation, setFlyToLocation] = useState<[number, number] | null>(null);

  return (
    <div className="h-dvh relative">
      <BetaDisclaimer />
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000]">
        <SearchButton onSearch={setFlyToLocation} />
      </div>
      <div className="absolute top-4 right-4 z-[1000]">
        <LanguageToggle />
      </div>
      <Map
        shelters={shelters}
        selectedShelter={selectedShelter}
        onMarkerClick={setSelectedShelter}
        flyToLocation={flyToLocation}
      />
      <div
        className="absolute left-4 right-4 z-[1000] flex flex-col items-end gap-3"
        style={{ bottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <CenterMapButton onLocate={setFlyToLocation} />
        <NavigateButton shelters={shelters} />
      </div>
    </div>
  );
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds.

**Step 3: Manual test**

Run: `npm run dev`

Verify:
1. Modal appears on first visit with beta message, data source link, and dismiss button
2. Clicking "Разбрах" dismisses the modal and it never appears again (localStorage)
3. Amber banner is visible at the top: "Бета версия — данните може да съдържат неточности"
4. Clicking X on the banner hides it for the session
5. Refreshing the page: banner reappears (sessionStorage cleared), modal stays dismissed (localStorage persists)
6. Switching to EN: texts update to English
7. Banner doesn't overlap with search button or language toggle

**Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: integrate beta disclaimer into map page"
```

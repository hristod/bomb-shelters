# User Feedback & Shelter Suggestions — Design

## Overview

Two feedback mechanisms using the Userback widget SDK:

1. **Report a problem** with an existing shelter — triggered from the map popup
2. **Suggest a new shelter** — triggered via Userback's built-in floating widget button

## Integration Architecture

### Userback Provider

A React context provider (`UserbackProvider`) wraps the app in `providers.tsx`. It initializes the `@userback/widget` SDK with the access token from `NEXT_PUBLIC_USERBACK_TOKEN` env var and exposes a `useUserback()` hook.

### Report a Problem (from popup)

- A "Report" button is added to the Leaflet popup content, below the shelter details.
- On click, calls `userback.openForm('bug')` with `custom_data` containing the shelter's `id`, `name`, `address`, `region`, and coordinates.
- This gives full context in the Userback dashboard without the user having to re-type it.

### Suggest a New Shelter (widget button)

- Userback's default floating widget button stays visible.
- It opens the `feature_request` form for shelter suggestions.
- Users describe the shelter (address, Google Maps link, etc.) in the free-text comment field.

## Components Changed

| Component | Change |
|---|---|
| `providers.tsx` | Wrap with `UserbackProvider` |
| `Map.tsx` popup | Add "Report" button that calls `userback.openForm('bug', { custom_data })` |
| `translations.ts` | Add `reportProblem` translation key (BG/EN) |
| `package.json` | Add `@userback/widget` dependency |
| `.env.local` | Add `NEXT_PUBLIC_USERBACK_TOKEN` |

## What We Don't Build

- No custom forms — Userback's own overlay handles all form UI
- No FAB or sidebar button — Userback's widget button covers "suggest"
- No backend API — SDK communicates directly with Userback
- No custom fields in Userback dashboard — free-text comment is sufficient

## Technical Details

### SDK Setup (Next.js)

```typescript
// src/lib/userback.tsx
'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import Userback from '@userback/widget';
import type { UserbackWidget } from '@userback/widget';

const UserbackContext = createContext<UserbackWidget | null>(null);

export function UserbackProvider({ children }: { children: React.ReactNode }) {
  const [userback, setUserback] = useState<UserbackWidget | null>(null);

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_USERBACK_TOKEN;
    if (!token) return;
    Userback(token).then(setUserback);
  }, []);

  return (
    <UserbackContext.Provider value={userback}>
      {children}
    </UserbackContext.Provider>
  );
}

export const useUserback = () => useContext(UserbackContext);
```

### Report Button in Popup

```typescript
userback.openForm('bug', {
  custom_data: {
    shelter_id: shelter.id,
    shelter_name: shelter.name,
    shelter_address: shelter.address,
    shelter_region: shelter.region,
    lat: shelter.lat,
    lng: shelter.lng,
  }
});
```

### Widget Button

Userback's default widget button is shown (no `autohide` option). It opens the `feature_request` form by default, configured in the Userback dashboard.

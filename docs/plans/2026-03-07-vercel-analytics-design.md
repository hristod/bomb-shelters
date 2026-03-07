# Vercel Analytics Integration

## Summary

Add `@vercel/analytics` to track page views and web vitals. Vercel-hosted only.

## Changes

1. Install `@vercel/analytics` package
2. Add `<Analytics />` component in `src/app/layout.tsx` inside `<body>`, alongside `<Providers>`

No configuration, env vars, or provider wrappers needed. Vercel handles collection automatically on deploy.

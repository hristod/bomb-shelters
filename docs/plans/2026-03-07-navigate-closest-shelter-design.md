# Navigate to Closest Shelter - Design Document

## Overview

A prominent emergency button that geolocates the user and opens turn-by-turn directions to the nearest bomb shelter via Google Maps or Apple Maps. The app requests location permission on every page visit to ensure fresh data is ready when the button is tapped.

## Location Permission

- Call `navigator.geolocation.getCurrentPosition()` on every page visit
- This pre-prompts the user for location access so it's already granted when they tap the button
- If denied: show a simple alert - "Location access is required to find the closest shelter"

## Button Placement

### Mobile
- Fixed full-width bar at the bottom of the screen, always visible above the bottom sheet
- Large, red emergency-style button
- Min height: 56px

### Desktop
- Sticky at the bottom of the sidebar

## Behavior on Tap

1. If location already granted: calculate closest shelter by straight-line distance (Haversine), open directions in new tab
2. If location not yet granted: prompt for permission, then proceed
3. If denied: show simple alert

## Navigation URL

- iOS: Apple Maps (`maps.apple.com/?daddr=lat,lng&dirflg=w`)
- Other platforms: Google Maps (`google.com/maps/dir/?api=1&origin=lat,lng&destination=lat,lng&travelmode=walking`)

## Closest Shelter Calculation

- Haversine formula over all shelters with valid lat/lng
- Pure client-side - 292 points is trivial to compute

## Visual Design

- Background: `#DC2626` (red-600)
- Text: white, bold, 18-20px
- Icon: Lucide `Navigation` or `Shield` icon
- Min height: 56px mobile, 48px desktop
- Rounded corners, subtle shadow for elevation

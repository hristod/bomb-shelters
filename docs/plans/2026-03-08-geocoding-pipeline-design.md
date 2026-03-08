# Geocoding Pipeline Design

## Problem

The app's shelter data (`data/shelters-raw.json`) is outdated and has incorrect/missing coordinates. A new authoritative PDF (`docs/shelters.pdf`, dated 06.10.2025) contains 247 shelters across 21 oblasts that should replace the existing data entirely. All entries need accurate lat/lng coordinates via geocoding.

## Source Document

- **File**: `docs/shelters.pdf`
- **Date**: 06.10.2025
- **Total shelters**: 247
- **Regions**: Бургас, Варна, Велико Търново, Враца, Габрово, Добрич, Кърджали, Кюстендил, Ловеч, Пазарджик, Перник, Плевен, Пловдив, Разград, Русе, Сливен, Смолян, София град, Стара Загора, Шумен, Ямбол
- **Fields per entry**: №, Обект (name), Адрес (address), Експлоатиращ обекта (operator), Подвид обект (type), Категория (category)

## Pipeline

### Step 1: Parse PDF into Structured JSON

Extract all 247 shelters from the PDF into a clean intermediate JSON file (`data/shelters-parsed.json`). Each entry will have:

```json
{
  "id": 1,
  "name": "КСЗ-общинско ОУ \"Братя Миладинови\"",
  "address": "гр. Бургас, ж.к. Братя Миладинови",
  "region": "Бургас",
  "operator": "община Бургас",
  "type": "Скривалище",
  "category": "II",
  "lat": null,
  "lng": null
}
```

IDs are assigned sequentially (1-247) across all regions. Category is normalized to "I" or "II".

### Step 2: Geocode via Google Maps API

- Use Google Geocoding API with the API key
- For each shelter, send the full address string (e.g. "гр. Бургас, ж.к. Братя Миладинови")
- Store the returned lat/lng coordinates
- Log Google's match quality (ROOFTOP, RANGE_INTERPOLATED, GEOMETRIC_CENTER, APPROXIMATE) for reference
- Add a delay between requests to respect rate limits
- Output: `data/shelters-geocoded.json` with lat/lng populated

### Step 3: Visual Verification via Playwright MCP

- Run the app locally (`npm run dev`)
- Use Playwright MCP to open the app in a headless browser
- For each shelter, pan the map to its coordinates and take a screenshot
- Review screenshots to identify misplaced pins (e.g. pin in a field instead of on a building)
- Flag entries that need coordinate correction

### Step 4: Fix and Finalize

- Manually correct coordinates for flagged shelters (via Google Maps lookup or manual adjustment)
- Write final output to `data/shelters-raw.json`, replacing existing data entirely
- Clean up intermediate files (`shelters-parsed.json`, `shelters-geocoded.json`)

## Technical Notes

- Geocoding script: Node.js script in `scripts/geocode.ts`
- Google Geocoding API: ~247 requests, well within free tier ($200/month = ~40,000 requests)
- Known hard-to-geocode patterns:
  - "ж.к." (neighborhood) + block number — may resolve to neighborhood center rather than exact building
  - Industrial zones — "Лукойл Нефтохим", "Южна промишлена зона"
  - Rural/village addresses — "с. Соколово, с. Соколово"
  - Descriptive locations — "11 км северозападно от гр. Панагюрище"
  - "РРТС-Стръмни рид, до с. Кременец" — landmark-based

## Output Schema

Final `data/shelters-raw.json` format (matching existing schema):

```json
{
  "id": 1,
  "name": "string",
  "address": "string",
  "region": "string",
  "operator": "string",
  "type": "Скривалище | Противорадиационно укритие",
  "category": "I | II",
  "lat": 42.xxxx,
  "lng": 27.xxxx
}
```

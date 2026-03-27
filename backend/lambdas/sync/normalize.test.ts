import type {
  OfficialArtist,
  OfficialScheduleItem,
  OfficialCategory,
  OfficialStage,
} from './official-api';
import {
  normalizeArtist,
  normalizeStage,
  normalizeCategory,
  normalizeEvent,
  extractUniqueStages,
} from './normalize';

// ── Fixtures ──────────────────────────────────────────────────────────────────
// Copy /crack JSON files into:
//   backend/tests/fixtures/ba2025/{artists,schedule,changes}.json
//   backend/tests/fixtures/ba2024/{artists,schedule,changes}.json

import artists2025 from '../../tests/fixtures/ba2025/artists.json';
import schedule2025 from '../../tests/fixtures/ba2025/schedule.json';
import artists2024 from '../../tests/fixtures/ba2024/artists.json';
import schedule2024 from '../../tests/fixtures/ba2024/schedule.json';

const a2025 = artists2025 as OfficialArtist[];
const a2024 = artists2024 as OfficialArtist[];
const s2025 = schedule2025 as { schedules: OfficialScheduleItem[]; categories: OfficialCategory[] };
const s2024 = schedule2024 as { schedules: OfficialScheduleItem[]; categories: OfficialCategory[] };

// ── normalizeArtist ───────────────────────────────────────────────────────────

describe('normalizeArtist', () => {
  it('slug is stored exactly as provided, not hardcoded', () => {
    const r25 = normalizeArtist('ba2025', a2025[0]);
    const r24 = normalizeArtist('ba2024', a2024[0]);
    expect(r25.slug).toBe('ba2025');
    expect(r24.slug).toBe('ba2024');
  });

  it('same numeric id from two editions produces isolated DynamoDB keys', () => {
    // If ba2025 and ba2024 happen to share an artist id, their records must differ by slug
    const sharedId = a2025[0].id;
    const r25 = normalizeArtist('ba2025', { ...a2025[0], id: sharedId });
    const r24 = normalizeArtist('ba2024', { ...a2024[0], id: sharedId });
    expect(r25.artistId).toBe(r24.artistId);   // same SK value
    expect(r25.slug).not.toBe(r24.slug);        // different PK — no collision
  });

  it('stringifies numeric id', () => {
    const result = normalizeArtist('ba2025', a2025[0]);
    expect(typeof result.artistId).toBe('string');
    expect(result.artistId).toBe(String(a2025[0].id));
  });

  it('maps scalar fields correctly', () => {
    const src = a2025[0];
    const result = normalizeArtist('ba2025', src);
    expect(result.name).toBe(src.name);
    expect(result.isPlayable).toBe(src.is_playable);
    expect(result.imageUrl).toBe(src.image_url);
    expect(result.thumbUrl).toBe(src.thumb_url);
  });

  it('prefers url over facebook_url, falls back to empty string', () => {
    const base = a2025[0];
    expect(normalizeArtist('ba2025', { ...base, url: 'https://band.com', facebook_url: 'https://fb.com' }).url)
      .toBe('https://band.com');
    expect(normalizeArtist('ba2025', { ...base, url: '', facebook_url: 'https://fb.com' }).url)
      .toBe('https://fb.com');
    expect(normalizeArtist('ba2025', { ...base, url: '', facebook_url: '' }).url)
      .toBe('');
  });

  it('preserves all localized entries with correct language codes', () => {
    const result = normalizeArtist('ba2025', a2025[0]);
    expect(result.localized).toHaveLength(a2025[0].localized.length);
    const langs = result.localized.map(l => l.language);
    expect(langs).toContain('EN');
    expect(langs).toContain('CS');
  });

  it('handles artist with no localized entries', () => {
    expect(normalizeArtist('ba2025', { ...a2025[0], localized: [] }).localized).toEqual([]);
  });

  it('coerces missing text fields to empty string', () => {
    const withNulls: OfficialArtist = {
      ...a2025[0],
      localized: [{
        id: 1, language: 'EN', name: 'X',
        content: null as unknown as string,
        genre: undefined as unknown as string,
        country: 'CZ',
        artist_id: a2025[0].id,
      }],
    };
    const { localized } = normalizeArtist('ba2025', withNulls);
    expect(localized[0].content).toBe('');
    expect(localized[0].genre).toBe('');
  });

  it('works across both fixture editions without cross-contamination', () => {
    const all25 = a2025.map(a => normalizeArtist('ba2025', a));
    const all24 = a2024.map(a => normalizeArtist('ba2024', a));
    expect(all25.every(r => r.slug === 'ba2025')).toBe(true);
    expect(all24.every(r => r.slug === 'ba2024')).toBe(true);
  });
});

// ── normalizeStage ────────────────────────────────────────────────────────────

describe('normalizeStage', () => {
  const stage2025 = s2025.schedules[0].stage;
  const stage2024 = s2024.schedules[0].stage;

  it('slug is stored exactly as provided', () => {
    expect(normalizeStage('ba2025', stage2025).slug).toBe('ba2025');
    expect(normalizeStage('ba2024', stage2024).slug).toBe('ba2024');
  });

  it('stringifies numeric id', () => {
    const result = normalizeStage('ba2025', stage2025);
    expect(typeof result.stageId).toBe('string');
    expect(result.stageId).toBe(String(stage2025.id));
  });

  it('maps image URLs', () => {
    const result = normalizeStage('ba2025', stage2025);
    expect(result.imageUrl).toBe(stage2025.image_url);
    expect(result.thumbUrl).toBe(stage2025.thumb_url);
  });

  it('drops latitude and longitude from output', () => {
    const result = normalizeStage('ba2025', stage2025);
    expect(result).not.toHaveProperty('latitude');
    expect(result).not.toHaveProperty('longitude');
  });

  it('maps localized names for each language', () => {
    const result = normalizeStage('ba2025', stage2025);
    expect(result.localized).toHaveLength(stage2025.localized.length);
    expect(result.localized[0]).toMatchObject({
      language: expect.any(String),
      name: expect.any(String),
    });
  });
});

// ── normalizeCategory ─────────────────────────────────────────────────────────

describe('normalizeCategory', () => {
  const cat2025 = s2025.categories[0];
  const cat2024 = s2024.categories[0];

  it('slug is stored exactly as provided', () => {
    expect(normalizeCategory('ba2025', cat2025).slug).toBe('ba2025');
    expect(normalizeCategory('ba2024', cat2024).slug).toBe('ba2024');
  });

  it('stringifies numeric id', () => {
    const result = normalizeCategory('ba2025', cat2025);
    expect(typeof result.categoryId).toBe('string');
    expect(result.categoryId).toBe(String(cat2025.id));
  });

  it('preserves color integer (including -1 sentinel)', () => {
    const result = normalizeCategory('ba2025', cat2025);
    expect(typeof result.color).toBe('number');
    // -1 is a valid "no color" value — must not be stripped
    const noColor = normalizeCategory('ba2025', { ...cat2025, color: -1 });
    expect(noColor.color).toBe(-1);
  });

  it('maps localized titles for all languages', () => {
    const result = normalizeCategory('ba2025', cat2025);
    expect(result.localized).toHaveLength(cat2025.localized.length);
    expect(result.localized[0]).toMatchObject({
      language: expect.any(String),
      title: expect.any(String),
    });
  });
});

// ── normalizeEvent ────────────────────────────────────────────────────────────

describe('normalizeEvent', () => {
  const item2025 = s2025.schedules[0];
  const item2024 = s2024.schedules[0];

  it('slug is stored exactly as provided', () => {
    expect(normalizeEvent('ba2025', item2025).slug).toBe('ba2025');
    expect(normalizeEvent('ba2024', item2024).slug).toBe('ba2024');
  });

  it('stringifies numeric event id', () => {
    const result = normalizeEvent('ba2025', item2025);
    expect(typeof result.eventId).toBe('string');
    expect(result.eventId).toBe(String(item2025.id));
  });

  it('preserves Unix ms timestamps as numbers', () => {
    const result = normalizeEvent('ba2025', item2025);
    expect(result.dateFrom).toBe(item2025.date_from);
    expect(result.dateTo).toBe(item2025.date_to);
  });

  it('stores all foreign keys as strings', () => {
    const result = normalizeEvent('ba2025', item2025);
    expect(result.artistId).toBe(String(item2025.artist_id));
    expect(result.stageId).toBe(String(item2025.stage_id));
    expect(result.categoryId).toBe(String(item2025.schedule_category_id));
  });

  it('does not embed artist or stage objects (normalized only)', () => {
    const result = normalizeEvent('ba2025', item2025);
    expect(result).not.toHaveProperty('artist');
    expect(result).not.toHaveProperty('stage');
  });
});

// ── extractUniqueStages ───────────────────────────────────────────────────────

describe('extractUniqueStages', () => {
  it('returns empty array for empty input', () => {
    expect(extractUniqueStages([])).toEqual([]);
  });

  it('deduplicates — same stage appearing on multiple events counted once', () => {
    const stageA: OfficialStage = { id: 10, image_url: '', thumb_url: '', localized: [] };
    const stageB: OfficialStage = { id: 20, image_url: '', thumb_url: '', localized: [] };
    const base = s2025.schedules[0];
    const items: OfficialScheduleItem[] = [
      { ...base, stage_id: stageA.id, stage: stageA },
      { ...base, stage_id: stageA.id, stage: stageA }, // duplicate
      { ...base, stage_id: stageB.id, stage: stageB },
    ];
    const result = extractUniqueStages(items);
    expect(result).toHaveLength(2);
    expect(result.map(s => s.id).sort()).toEqual([10, 20]);
  });

  it('number of unique stages <= number of schedule items', () => {
    const stages = extractUniqueStages(s2025.schedules);
    expect(stages.length).toBeLessThanOrEqual(s2025.schedules.length);
    expect(stages.length).toBeGreaterThan(0);
  });

  it('no duplicate ids in output from real fixture', () => {
    const stages = extractUniqueStages(s2025.schedules);
    const ids = stages.map(s => s.id);
    expect(ids.length).toBe(new Set(ids).size);
  });

  it('produces same count for ba2024 fixture', () => {
    const stages = extractUniqueStages(s2024.schedules);
    const ids = stages.map(s => s.id);
    expect(ids.length).toBe(new Set(ids).size);
  });
});

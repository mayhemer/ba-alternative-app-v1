// Returns the list of available festival edition slugs.
// Mockup implementation — replace with config or endpoint later.

export async function getSlugs(): Promise<string[]> {
  // 2020 and 2021 are absent — both editions were cancelled (COVID-19).
  return [
    'ba2019', 'ba2022', 'ba2023', 'ba2024', 'ba2025', 'ba2026', 'ba2027',
  ];
}

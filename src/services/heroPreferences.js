import { readStorage } from "../utils/storage.js";

export const HERO_PREFERENCES_KEY = "cinehub-hero-preferences";
export function getHeroPreferences() {
  const value = readStorage(HERO_PREFERENCES_KEY, { featuredIds: [] });
  return { featuredIds: Array.isArray(value?.featuredIds) ? value.featuredIds : [] };
}

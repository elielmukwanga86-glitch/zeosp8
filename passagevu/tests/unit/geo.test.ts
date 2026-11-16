import { describe, expect, it } from "vitest";
import { distanceMeters, isOnSite } from "@/lib/geo";

describe("distanceMeters", () => {
  it("vaut 0 pour le même point", () => {
    expect(distanceMeters({ lat: 48.8566, lng: 2.3522 }, { lat: 48.8566, lng: 2.3522 })).toBe(0);
  });
  it("Paris – Versailles ≈ 17 km", () => {
    const d = distanceMeters({ lat: 48.8566, lng: 2.3522 }, { lat: 48.8049, lng: 2.1204 });
    expect(d).toBeGreaterThan(16_500);
    expect(d).toBeLessThan(18_000);
  });
});

describe("isOnSite", () => {
  const site = { lat: 48.8566, lng: 2.3522, radiusM: 150 };
  it("accepte un point à ~100 m", () => {
    expect(isOnSite(site, { lat: 48.8575, lng: 2.3522 })).toBe(true);
  });
  it("refuse un point à ~1 km", () => {
    expect(isOnSite(site, { lat: 48.8656, lng: 2.3522 })).toBe(false);
  });
  it("plafonne la marge de précision à 100 m", () => {
    // ~330 m : refusé même si le téléphone annonce 5 km d'imprécision
    expect(isOnSite(site, { lat: 48.8596, lng: 2.3522, accuracyM: 5000 })).toBe(false);
  });
});

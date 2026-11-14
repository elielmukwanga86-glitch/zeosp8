-- =============================================================================
-- Vacatio — 0007 : données de référence (jours fériés, code promo fondateur)
-- =============================================================================

-- Jours fériés France métropolitaine 2026-2027 (à compléter chaque année par la
-- fonction cron « jours-feries », phase 4). Alsace-Moselle : 26/12 et Vendredi saint.
insert into public.public_holidays (day, label, region) values
  ('2026-01-01', 'Jour de l''an', 'FR'), ('2026-04-06', 'Lundi de Pâques', 'FR'),
  ('2026-05-01', 'Fête du Travail', 'FR'), ('2026-05-08', 'Victoire 1945', 'FR'),
  ('2026-05-14', 'Ascension', 'FR'), ('2026-05-25', 'Lundi de Pentecôte', 'FR'),
  ('2026-07-14', 'Fête nationale', 'FR'), ('2026-08-15', 'Assomption', 'FR'),
  ('2026-11-01', 'Toussaint', 'FR'), ('2026-11-11', 'Armistice 1918', 'FR'),
  ('2026-12-25', 'Noël', 'FR'),
  ('2027-01-01', 'Jour de l''an', 'FR'), ('2027-03-29', 'Lundi de Pâques', 'FR'),
  ('2027-05-01', 'Fête du Travail', 'FR'), ('2027-05-06', 'Ascension', 'FR'),
  ('2027-05-08', 'Victoire 1945', 'FR'), ('2027-05-17', 'Lundi de Pentecôte', 'FR'),
  ('2027-07-14', 'Fête nationale', 'FR'), ('2027-08-15', 'Assomption', 'FR'),
  ('2027-11-01', 'Toussaint', 'FR'), ('2027-11-11', 'Armistice 1918', 'FR'),
  ('2027-12-25', 'Noël', 'FR'),
  ('2026-04-03', 'Vendredi saint', 'FR-MOSELLE-ALSACE'), ('2026-12-26', 'Saint-Étienne', 'FR-MOSELLE-ALSACE'),
  ('2027-03-26', 'Vendredi saint', 'FR-MOSELLE-ALSACE'), ('2027-12-26', 'Saint-Étienne', 'FR-MOSELLE-ALSACE')
on conflict do nothing;

-- -40 % à vie, 10 premiers clients. stripe_coupon_id est renseigné en phase 5.
insert into public.promo_codes (code, percent_off, max_redemptions)
values ('FONDATEUR', 40, 10)
on conflict (code) do nothing;

---
name: adr
description: Zapisuje arhitektonsku odluku (ADR) sa razlogom i alternativama u docs/adr/ i linkuje je iz ARHITEKTURA.md. Za izbor biblioteke, promjenu obima ili strukture.
argument-hint: <naslov odluke>
model: sonnet
---

# /adr: zapiši odluku

*Zašto:* za šest mjeseci niko se neće sjećati **zašto** je nešto urađeno baš tako. Bez zapisanog razloga odluka se ili slijepo poštuje, ili se slučajno pokvari.

Naslov: `$ARGUMENTS`

1. Pogledaj `docs/adr/`: sljedeći broj je najveći postojeći + 1 (četiri cifre, npr. `0004`).
2. Iz razgovora izvuci kontekst, odluku i alternative. Ako nešto od toga fali, pitaj (najviše 2 pitanja).
3. Napravi `docs/adr/NNNN-<naslov-kebab>.md`:
   ```markdown
   # NNNN: <Naslov>

   **Datum:** YYYY-MM-DD · **Status:** prihvaćeno

   ## Kontekst
   <problem i ograničenja, 2–4 rečenice>

   ## Odluka
   <šta je odlučeno i glavni razlog>

   ## Razmotrene alternative
   | Opcija | Zašto ne |
   |---|---|

   ## Posljedice
   - Dobijamo: …
   - Plaćamo: …
   ```
4. Dodaj link u `docs/ARHITEKTURA.md` pod `## Odluke`.
5. Ako nova odluka zamjenjuje staru: staroj promijeni status u `zamijenjeno ADR NNNN`. Staru ne briši.
6. Ako je odluka **promjena obima**, ažuriraj i `## Obim` / `## Van obima` u `docs/VIZIJA.md`.
7. Commit: `docs(adr): NNNN <naslov>`.

---
name: stanje
description: Osvježava STATUS.md projekta, tj. trenutno stanje (šta radi, šta je sljedeće, blokeri), na osnovu git loga, STATUS-a i ove sesije. Koristi kad korisnik kaže "/stanje", "ažuriraj status", "gdje smo stali".
model: haiku
allowed-tools: [Read, Write, Edit, Bash, Glob]
---

# /stanje: osvježi STATUS.md

*Zašto:* STATUS.md je kratka memorija agenta. Ako je zastario, sljedeća sesija kreće od pogrešne tačke. Ako postane dnevnik, niko ga ne čita.

1. Pročitaj `STATUS.md`. Ako ne postoji, napravi ga po strukturi ispod.
2. Pogledaj šta je novo: `git log --oneline -15` i `git status --short`. Ako postoji `docs/BLUEPRINT.md`, pogledaj trenutni milestone.
3. **Prepiši** STATUS.md, ne dopisuj ga. Pravila:
   - najviše 30 linija,
   - samo sadašnjost: šta radi, šta je sljedeće (≤ 5 stavki, najvažnije prvo), blokeri,
   - bez historije i datuma pojedinih koraka, jer je to u git logu,
   - završeni zadaci izlaze iz "Sljedeće". Ako su bitna funkcija, idu u "Radi" kao jedna linija.
4. Pokaži korisniku kratak diff (šta se promijenilo). Ne commituj: to radi `/kraj-sesije`.

Struktura:
```markdown
# STATUS

**Ažurirano:** YYYY-MM-DD · **Milestone:** Mx: <ime>

## Radi
- …

## Sljedeće
1. …

## Blokeri / otvorena pitanja
- nema
```

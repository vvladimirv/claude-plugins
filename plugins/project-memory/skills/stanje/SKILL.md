---
name: stanje
description: "Osvježava STATUS.md (šta radi, šta je sljedeće, blokeri) iz git loga i sesije. Za \"/stanje\", \"gdje smo stali\"."
model: haiku
allowed-tools: [Read, Write, Edit, Bash, Glob]
---

# /stanje: osvježi STATUS.md

**Prvo, projekat bez kickstarta:** ako `STATUS.md` postoji, ovaj pasus preskoči i radi normalno. Ako ne postoji, a projekat ima fajl `.claude/bez-kickstarta`, ovu komandu ovdje ne izvršavaj i ništa ne pravi (ni `STATUS.md`, ni `CHANGELOG.md`, ni `docs/*`, ni `.claude/kickstart.json`). Reci korisniku da projekat ima svoj sistem dokumenata i da pravila rada nađe u `AGENTS.md`/`CLAUDE.md` projekta. Ako ta pravila kažu kako se ovaj posao ovdje radi, navedi to u jednoj rečenici. Zatim stani.

*Zašto:* STATUS.md je kratka memorija agenta. Ako je zastario, sljedeća sesija kreće od pogrešne tačke. Ako postane dnevnik, niko ga ne čita.

1. Pročitaj `STATUS.md`. Ako ne postoji, napravi ga po strukturi ispod.
2. Pogledaj šta je novo: `git log --oneline -15` i `git status --short`. Ako postoji `docs/BLUEPRINT.md`, pogledaj trenutni milestone.
3. **Prepiši** STATUS.md, ne dopisuj ga. Pravila:
   - najviše 30 linija (isto ograničenje koristi hook na startu sesije: duži STATUS se u kontekstu skrati),
   - samo sadašnjost: šta radi, šta je sljedeće (≤ 5 stavki, najvažnije prvo), blokeri,
   - bez historije i datuma pojedinih koraka, jer je to u git logu,
   - završeni zadaci izlaze iz "Sljedeće". Ako su bitna funkcija, idu u "Radi" kao jedna linija.
   - **STATUS je postao dnevnik** (duži od 30 linija, datumi koraka, liste urađenog): prepiši ga u stanje po strukturi ispod. Historiju ne prenosi, jer je u git logu. Ono što nije zapisano nigdje drugo, a još važi, premjesti: odluka u `docs/adr/`, izdanje u `CHANGELOG.md`, pravilo rada u `AGENTS.md`. Ako nisi siguran da je nešto zapisano drugdje, pitaj prije nego ga izbaciš.
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

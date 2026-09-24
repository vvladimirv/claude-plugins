---
name: kraj-sesije
description: Kraj rada: testovi, STATUS.md i mali logični commitovi. Za "/kraj-sesije", "završavamo", "snimi sve".
model: sonnet
allowed-tools: [Read, Write, Edit, Bash, Glob, Grep]
---

# /kraj-sesije: snimi save point

*Zašto:* necommitovan rad je rad bez save pointa. Ako sutra nešto krene po zlu, nema se na šta vratiti. Svaka sesija završava čistim stanjem.

1. **Pregled:** `git status --short` i `git diff --stat`. Ako nema izmjena, reci to i stani.
2. **Sigurnost:** u izmjenama ne smije biti `.env`, `data/`, stvarnih podataka ni ključeva. Ako ih vidiš, stani i pitaj.
3. **Testovi:** pokreni brze testove (vidi **Brzi testovi** ispod). Ako testovi padnu, **ne commituj**. Pokaži sažetak greške i pitaj korisnika: popraviti sada ili commitovati kao WIP na posebnu granu.
4. **STATUS.md:** osvježi ga po pravilima iz `/stanje` (prepiši, ≤ 30 linija, samo sadašnjost).
5. **Commitovi:** grupiši izmjene u logične cjeline (jedna cjelina = jedan commit). Poruke idu po Conventional Commits, opis na bosanskom, npr. `feat(budzet): unos troška`. STATUS.md ide u zadnji commit.
6. **Ne pushaj** bez izričitog zahtjeva korisnika.
7. **Završna poruka** (kratko): commitovi (hash + poruka), stanje testova i prva stavka iz "Sljedeće" za sutra.

## Brzi testovi
Traži u folderu koji testiraš i uzmi prvo što postoji:
1. `scripts/test` (ili `scripts/test.mjs`, `.js`, `.ps1`),
2. komanda za brze testove iz `AGENTS.md` (sekcija „Komande" ili „Brzi testovi"),
3. `npm run test:fast`, ako `package.json` ima skriptu `test:fast`.

Ako nema ničega, pitaj korisnika koju komandu da pokreneš.

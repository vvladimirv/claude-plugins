---
name: kraj-sesije
description: Kraj rada: testovi, STATUS.md, mali logični commitovi, push i zatvaranje sesije. Za "/kraj-sesije", "završavamo", "snimi sve".
model: sonnet
allowed-tools: [Read, Write, Edit, Bash, Glob, Grep, AskUserQuestion]
---

# /kraj-sesije: snimi save point

*Zašto:* necommitovan rad je rad bez save pointa. Ako sutra nešto krene po zlu, nema se na šta vratiti. Rad koji nije pushovan ne vidi ni druga sesija ni drugi računar. Svaka sesija završava čistim stanjem i zatvara se kad je posao gotov.

1. **Pregled:** `git status --short` i `git diff --stat`. Ako nema izmjena, preskoči na korak 6 (push i zatvaranje). Ako je grana iza GitHuba (`git status -sb` pokazuje `behind`), prvo `git pull --rebase`.
2. **Sigurnost:** u izmjenama ne smije biti `.env`, `data/`, stvarnih podataka ni ključeva. Ako ih vidiš, stani i pitaj.
3. **Testovi:** pokreni brze testove (vidi **Brzi testovi** ispod). Ako testovi padnu, **ne commituj**. Pokaži sažetak greške i pitaj korisnika: popraviti sada ili commitovati kao WIP na posebnu granu.
4. **STATUS.md:** osvježi ga po pravilima iz `/stanje` (prepiši, ≤ 30 linija, samo sadašnjost).
5. **Commitovi:** grupiši izmjene u logične cjeline (jedna cjelina = jedan commit). Poruke idu po Conventional Commits, opis na bosanskom, npr. `feat(budzet): unos troška`. STATUS.md ide u zadnji commit.
6. **Push:** ako repo ima `origin`, a grana ima commitove koji nisu na GitHubu, pitaj da li da pushujem. Push samo uz izričito "da".
7. **Završna poruka** (kratko): commitovi (hash + poruka), stanje testova, da li je pushovano i prva stavka iz "Sljedeće" za sutra.
8. **Zatvaranje sesije:** ako je `git status` čist (sve je commitovano), pitaj (AskUserQuestion): **"Posao je gotov. Da zatvorim ovu sesiju?"** sa opcijama "Da, zatvori" / "Ne, ostavi otvorenu".
   - **Da:** u desktop aplikaciji arhiviraj ovu sesiju alatom za arhiviranje sesija (`session_id: "self"`, razlog: "kraj-sesije: sve commitovano"). Arhiviranje zaustavi sesiju i oslobodi bravu, a sesija se kasnije može otvoriti iz liste arhiviranih. Razgovor tu završava, pa završna poruka (korak 7) mora biti prije toga.
   - Ako alat za arhiviranje nije dostupan (terminal), reci korisniku da sesiju zatvori sa `/exit`.
   - Ako ima necommitovanog rada, ne nudi zatvaranje, nego reci šta je ostalo.

## Brzi testovi
Traži u folderu koji testiraš i uzmi prvo što postoji:
1. `scripts/test` (ili `scripts/test.mjs`, `.js`, `.ps1`),
2. komanda za brze testove iz `AGENTS.md` (sekcija „Komande" ili „Brzi testovi"),
3. `npm run test:fast`, ako `package.json` ima skriptu `test:fast`.

Ako nema ničega, pitaj korisnika koju komandu da pokreneš.

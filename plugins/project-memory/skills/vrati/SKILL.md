---
name: vrati
description: Vraća projekat na zadnje stanje koje je radilo (odbaci nesnimljene izmjene ili poništi zadnje commitove), uvijek tako da se može povratiti. Za "/vrati", "pokvarilo se", "vrati kako je bilo"; "/vrati poništi" vraća zadnje vraćanje.
argument-hint: "[šta se pokvarilo] | poništi"
model: sonnet
allowed-tools: [Read, Bash, Glob, Grep, AskUserQuestion]
---

# /vrati: nazad na stanje koje je radilo

*Zašto:* korisnik nije programer. Kad nešto prestane raditi, treba mu jedan siguran korak nazad, a ne popravka naslijepo. Vraćanje nikad ne briše rad zauvijek: odbačene izmjene idu u `git stash`, a poništeni commitovi ostaju u historiji.

Korisnik je napisao: `$ARGUMENTS`

**Nikad:** `git reset --hard`, `git checkout -- .`, `git restore .`, `git clean`, `git push --force`, brisanje grana ili stash-a. Svaka od tih komandi briše rad bez povratka.

1. **Pregled** (bez pitanja): `git status --short`, `git log -10 --format="%h %ar %s"` i `git stash list`. Ako folder nije git repo, reci da nema save pointa na koji se može vratiti, i stani.
2. **Ako je argument `poništi`:** nađi zadnje vraćanje. Ako je na vrhu `git stash list` unos koji počinje sa `vrati`, vrati ga sa `git stash pop`. Ako je zadnji commit `revert: vrati ...`, poništi ga sa `git revert --no-edit HEAD`. Prije toga objasni šta se vraća i čekaj izričito "da". Zatim idi na korak 5.
3. **Izaberi način** i objasni ga običnim riječima: koje funkcije ili ekrani se vraćaju, ne hashevi.
   - **A. Pokvarilo se od zadnjeg snimanja** (ima necommitovanih izmjena, a zadnji commit je radio): odbaci izmjene sa `git stash push -u -m "vrati YYYY-MM-DD HH:MM: <kratak opis>"`.
   - **B. Pokvarilo se ranije:** pokaži zadnjih 5–10 commitova kao listu "kad · šta je urađeno" (prevedi poruke na običan jezik) i pitaj (AskUserQuestion): "Do kojeg koraka je sve radilo?". Zatim `git revert --no-commit <dobar>..HEAD` i jedan commit `revert: vrati na <dobar> (<kratak opis>)`. Tako je poništavanje jedan korak, a radi i kad je već pushovano. Ako ima necommitovanih izmjena, prvo uradi A.
   - Ako korisnik ne zna kad je radilo, izaberi zadnji commit prije vremena kad je primijetio problem (pitaj "kad je zadnji put radilo?") i reci da se može ići i korak dalje nazad.
4. **Potvrda:** napiši šta će se desiti i šta se gubi iz aplikacije, pa čekaj izričito "da".
5. **Izvrši**, pa pokreni brze testove (vidi **Brzi testovi** ispod).
6. **Provjera sa korisnikom:** reci mu kako da proba (kako pokrene aplikaciju i šta da klikne) i pitaj da li sada radi. Ako ne radi, ponudi korak dalje nazad (B sa starijim commitom).
7. **Završna poruka** (kratko): šta je vraćeno, stanje testova i kako se predomisliti: `/vrati poništi`. Push ne radi ovdje: ide kroz `/kraj-sesije`, uz izričito "da".

## Brzi testovi
Traži u folderu koji testiraš i uzmi prvo što postoji:
1. `scripts/test` (ili `scripts/test.mjs`, `.js`, `.ps1`),
2. komanda za brze testove iz `AGENTS.md` (sekcija „Komande" ili „Brzi testovi"),
3. `npm run test:fast`, ako `package.json` ima skriptu `test:fast`.

Ako nema ničega, pitaj korisnika koju komandu da pokreneš.

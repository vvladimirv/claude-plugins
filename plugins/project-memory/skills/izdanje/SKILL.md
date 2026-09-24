---
name: izdanje
description: Izdaje gotov MVP ili verziju. Provjeri da je sve gotovo i testovi zeleni, zapiše CHANGELOG i git tag, pa zamrzne obim (održavanje) ili otvori plan sljedeće verzije.
argument-hint: "[verzija, npr. v1.0]"
model: sonnet
---

# /izdanje: ciljna linija

*Zašto:* bez ciljne linije projekat se beskonačno dorađuje. Izdanje kaže "ovo je gotovo i radi". Poslije toga nove funkcije ne ulaze usput, nego kroz plan nove verzije sa svojim obimom i rokovima.

Verzija: `$ARGUMENTS` (ako je prazno: `v1.0` za prvo izdanje, inače sljedeća manja verzija).

1. **Uslovi:** pokreni `/napredak` (bez html).
   - Ako MVP nije gotov: pokaži šta fali. Ponudi da se nedovršene funkcije prebace u `odloženo (v2)` (uz ADR), ili stani.
   - Pokreni brze testove (`scripts/test`) i pune testove (npr. `npm run test:all`, ako postoje). Crveno znači stop.
   - `git status` mora biti čist.
2. **CHANGELOG.md** u korijenu (napravi ako ne postoji). Nova sekcija na vrhu: `## <verzija> (YYYY-MM-DD)`, sa stavkama iz `git log <zadnji tag>..HEAD`, grupisanim u *Novo* (feat), *Popravke* (fix) i *Ostalo*, na bosanskom i kratko. Uvijek navedi F-funkcije.
3. **Dokumenti:**
   - `docs/BLUEPRINT.md`: na kraj dodaj `✅ <verzija> izdata YYYY-MM-DD`,
   - `STATUS.md`: "<verzija> izdata, održavanje",
   - `.claude/kickstart.json`: `"faza": "odrzavanje"` i dodaj `{"verzija": "<verzija>", "datum": "YYYY-MM-DD"}` u niz `"izdanja"`.
4. **Commit i tag:** `chore(izdanje): <verzija>`, pa `git tag -a <verzija> -m "<verzija>: <jedna rečenica>"`. Push commita i taga **samo uz izričito da**.
5. **Šta dalje** (AskUserQuestion):
   - **Održavanje** (preporuka odmah poslije v1.0): popravke bugova su slobodne. Nove funkcije idu u `/ideja`, a čuvar obima to provodi.
   - **Planiraj sljedeću verziju:** kratak intervju (3–5 funkcija, šta nije u obimu, tempo), pa u BLUEPRINT.md nova sekcija `## Verzija <sljedeća>` sa milestoneima, **rokovima** i statusom `planirano`. Nove funkcije dobijaju F-brojeve u inventaru. Uz to ide ADR "obim <sljedeća verzija>", dopuna `## Obim` u VIZIJA.md i `"faza": "razvoj"` u kickstart.json.

# Blueprint

<!-- UPUTA: Redoslijed rada sa rokovima. Svaki milestone traje 1–3 radna dana i završava nečim što radi i ima test. Kolone "Rok" i "Status" čita /napredak (i linija napretka na startu sesije): zadrži tačne nazive i formate. Ne dopisuj dnevnik. -->

## Tempo
Početak: {{DATUM_POCETKA}} · {{SATI}} sati rada sedmično

## Milestones
| # | Cilj | Funkcije | Gotovo kad | Rok | Status |
|---|---|---|---|---|---|
| M1 | Kostur koji se pokreće + prvi test | — | `{{KOMANDA_POKRETANJE}}` radi, brzi testovi zeleni | {{YYYY-MM-DD}} | u toku |
| M2 | {{CILJ_M2}} | F-01, F-02 | {{KRITERIJ}} | {{YYYY-MM-DD}} | planirano |
| M3 | {{CILJ_M3}} | F-03 | {{KRITERIJ}} | {{YYYY-MM-DD}} | planirano |

- **Status:** `planirano` · `u toku` · `gotovo YYYY-MM-DD` (datum završetka hrani prognozu).
- **Pomjeren rok:** `2026-10-05 → 2026-10-12`, uz razlog ispod tabele. Prvobitni rok ostaje vidljiv.
- **Kad se kasni:** svjesno biraj između (a) smanji obim (funkcija → `odloženo (v2)` + ADR), (b) novi rok sa razlogom, (c) nastavi.

## Cilj: MVP gotov
MVP je gotov kad:
- [ ] sve funkcije iz inventara (osim `odloženo (v2)` i `uklonjena`) imaju status `radi`,
- [ ] svi milestonei su `gotovo`,
- [ ] ispunjeno je "Uspjeh znači" iz [VIZIJA](VIZIJA.md).

Tada slijedi `/izdanje` (v1.0) i obim se zamrzava. Nove funkcije idu u plan sljedeće verzije, ne usput.

## Prvih 5 zadataka (M1)
1. {{ZADATAK}}
2. {{ZADATAK}}
3. {{ZADATAK}}
4. {{ZADATAK}}
5. {{ZADATAK}}

## Definicija "gotovo" (za svaki zadatak)
- [ ] brzi testovi zeleni
- [ ] funkcija ima test ponašanja i upisana je u `INVENTAR-FUNKCIJA.md` sa ažurnim statusom
- [ ] nijedan fajl nije preko limita
- [ ] `STATUS.md` ažuriran; kad milestone završi, u BLUEPRINT.md mu je `Status` `gotovo YYYY-MM-DD`
- [ ] commit

---
name: napredak
description: "Napredak projekta po blueprintu: milestonei sa rokovima, funkcije po statusu, kašnjenje i prognoza završetka MVP-a. \"/napredak\" u terminalu, \"/napredak html\" kao vizuelni pregled."
argument-hint: "[html]"
model: haiku
allowed-tools: [Bash, Read]
---

# /napredak

**Prvo, projekat bez kickstarta:** ako projekat ima fajl `.claude/bez-kickstarta`, ovu komandu ovdje ne izvršavaj i ništa ne pravi (ni `STATUS.md`, ni `CHANGELOG.md`, ni `docs/*`, ni `.claude/kickstart.json`). Reci korisniku da projekat ima svoj sistem dokumenata i da pravila rada nađe u `AGENTS.md`/`CLAUDE.md` projekta. Ako ta pravila kažu kako se ovaj posao ovdje radi, navedi to u jednoj rečenici. Zatim stani.

*Zašto:* bez mjerenja napretka rad može trajati beskonačno. Pregled se računa mašinski iz `docs/BLUEPRINT.md` i `docs/INVENTAR-FUNKCIJA.md`, pa je uvijek tačan koliko i ti dokumenti.

Skripta je u folderu ovog plugina: `<folder ovog skilla>/../../hooks/progress-cli.js`.

- **Bez argumenta:** pokreni `node "<skripta>" --root "<korijen projekta>"` i prikaži izlaz **doslovno** u bloku koda.
- **`html`:** pokreni `node "<skripta>" --root "<korijen projekta>" --html "<sistemski temp folder>/napredak-<ime projekta>.html"`. Fajl ide u temp folder, **ne u repo**. Zatim ga pokaži korisniku: u desktop aplikaciji preko alata za slanje fajla (prikaz inline), a inače ga otvori u pregledniku (`start "" "<fajl>"` na Windowsu).

Nakon prikaza dodaj najviše 2 rečenice:
- ako neki milestone kasni, ponudi izbor: smanji obim (funkcija → `odloženo (v2)` + `/adr`), novi rok sa razlogom u BLUEPRINT.md, ili nastavi,
- ako je MVP gotov, predloži `/izdanje`,
- ako rokovi fale, predloži `/kickstart --nadogradi`.

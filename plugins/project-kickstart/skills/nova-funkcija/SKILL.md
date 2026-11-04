---
name: nova-funkcija
description: Nova funkcija na pravo mjesto: provjera obima, F-broj u inventaru, folder po arhitekturi i test ponašanja prije koda.
argument-hint: <ime funkcije> [kratak opis]
model: sonnet
---

# /nova-funkcija

**Prvo, projekat bez kickstarta:** ako projekat ima fajl `.claude/bez-kickstarta`, ovu komandu ovdje ne izvršavaj i ništa ne pravi (ni `STATUS.md`, ni `CHANGELOG.md`, ni `docs/*`, ni `.claude/kickstart.json`). Reci korisniku da projekat ima svoj sistem dokumenata i da pravila rada nađe u `AGENTS.md`/`CLAUDE.md` projekta. Ako ta pravila kažu kako se ovaj posao ovdje radi, navedi to u jednoj rečenici. Zatim stani.

**Lagani projekat** (`.claude/kickstart.json` ima `"rezim": "lagano"`): radi smanjeno: korak 1 (obim) i test ponašanja prije koda ostaju. POJMOVI, ARHITEKTURA i INVENTAR ne postoje: preskoči korake 2 i 3, novi kod prati postojeću strukturu foldera, bez F-broja i bez upisa u inventar, EKRANI i POJMOVI. Commit: `feat(<ime>): kostur <ime>`.

*Zašto:* agent najlakše dopisuje kod u fajl koji je već otvoren, i tako nastaju monoliti. Nova funkcija zato uvijek dobija svoj folder, svoj F-broj i svoj test prije prve linije koda.

Zahtjev: `$ARGUMENTS`

1. **Obim:** pročitaj `docs/VIZIJA.md`. Ako funkcija nije u **Obimu**, stani i ponudi 4 izbora čuvara obima (povezano / proširenje obima / `/novi-projekat` / `/ideja`).
2. **Pojmovi:** pročitaj `docs/POJMOVI.md`. Za ime foldera i koda koristi postojeće pojmove. Nov pojam prvo predloži za POJMOVI.md.
3. **Mjesto:** pročitaj `docs/ARHITEKTURA.md` (struktura foldera, slojevi) i `docs/INVENTAR-FUNKCIJA.md` (sljedeći slobodan F-broj). Ako slična funkcija već postoji, predloži proširenje umjesto nove.
4. **Prijedlog** (čekaj OK): F-broj, ime, opis u jednoj rečenici, folder `src/features/<ime>/` sa fajlovima po slojevima (prikaz · logika · podaci · test), ekran (ako ima UI) i kako se testira.
5. **Nakon OK-a:**
   - napravi folder i fajlove kao kostur sa jasnim imenima (bez logike),
   - napiši **test ponašanja** koji opisuje šta korisnik dobija. Neka prvo pada (crveno), jer je to cilj,
   - dodaj red u `docs/INVENTAR-FUNKCIJA.md` sa statusom `u izradi`,
   - ako ima UI: dodaj funkciju ekranu u `docs/EKRANI.md`,
   - nove pojmove upiši u `docs/POJMOVI.md`.
6. Commit: `feat(<ime>): kostur F-xx <ime>`. Zatim predloži prvi korak implementacije: učiniti taj test zelenim.

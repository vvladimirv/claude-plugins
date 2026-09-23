---
name: nova-funkcija
description: Dodaje novu funkciju na pravo mjesto. Provjeri obim, dodijeli F-broj u inventaru, napravi folder funkcije po arhitekturi i test koji opisuje ponašanje. Koristi kad korisnik kaže "/nova-funkcija", "dodaj novu funkciju", "nova mogućnost", prije pisanja koda za novu funkcionalnost.
argument-hint: <ime funkcije> [kratak opis]
model: sonnet
---

# /nova-funkcija

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

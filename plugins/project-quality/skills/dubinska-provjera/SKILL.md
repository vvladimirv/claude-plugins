---
name: dubinska-provjera
description: "Dubinska provjera ispravnosti: pravila koja nikad ne smiju pasti na hiljadama slučajnih primjera, mutacije koje otkrivaju slabe testove, simulacija više perioda i statička analiza, po stacku projekta. Za \"/dubinska-provjera\", obračune, novac, datume i prije izdanja."
argument-hint: "[invarijante|mutacije|simulacija|staticka|sve] [modul ili oblast]"
---

# /dubinska-provjera

*Zašto:* obični testovi provjeravaju primjere kojih se autor sjetio. Greške u novcu, datumima i prelazima perioda kriju se u primjerima kojih se niko nije sjetio. Ova komanda traži ih sistematski i prijavljuje nalaze. Ne popravlja kod bez korisnikovog OK.

Zahtjev: `$ARGUMENTS` (prazno = `sve` nad oblastima s najvećim rizikom: novac, obračun, prava pristupa, prelaz perioda).

## 1. Stack i postojeći alati
- Pročitaj `AGENTS.md`/`CLAUDE.md`, `.agent-checks.json` i manifest zavisnosti (`pyproject.toml`, `package.json`, `pubspec.yaml`, `go.mod`, `*.csproj`, `pom.xml`/`build.gradle`).
- Alat po stacku uzmi iz [ALATI.md](ALATI.md). Ako je alat već u projektu, koristi njega i njegovu konfiguraciju.
- Nov alat je razvojna (dev) zavisnost. Poštuj pravilo projekta za nove zavisnosti (ADR, obrazloženje, lock fajl) prije instalacije. Ne mijenjaj produkcijske zavisnosti.

## 2. Plan (kratko, pa radi)
Tabela: oblast → pravilo/rizik → tehnika → gdje ide test. Pravila uzmi iz dokumentacije projekta (`docs/`, ADR-ovi, `/poslovna-pravila`, potvrde stručnjaka domene). Svako pravilo označi kao **potvrđeno** (izvor) ili **pretpostavka**. Pretpostavka nije dokaz greške: nalaz nad njom ide kao pitanje.

## 3. Tehnike
Radi one iz argumenta, a za `sve` redom 3a, 3b, 3d, pa 3c ako projekt ima periode (godine, mjesece, obračune).

**3a. Invarijante (property-based):** generator pravi slučajne, ali ispravne ulaze (iznose, datume, nizove radnji), a test provjerava pravilo koje važi za svaki ulaz. Tipična pravila:
- zbir se čuva: duguje = potražuje, raspodjela po dijelovima daje tačno ukupan iznos, zaokruživanje ne gubi ni ne dodaje novac;
- obrnuta radnja poništava: storno/otkazivanje vraća stanje na nulu, uvoz pa izvoz daje isti fajl;
- prelaz perioda: početno stanje = zaključno stanje prethodnog perioda, ništa se ne broji dvaput;
- granice: prvi i zadnji dan perioda, prestupna godina, nula, negativno, najveći dozvoljeni iznos;
- izolacija: radnja jednog korisnika ili organizacije ne mijenja tuđe podatke;
- idempotentnost: ponovljen uvoz ili ponovljeno knjiženje ne pravi duplikat.

Koristi stvarne servise i bazu kao postojeći integracijski testovi (ne mockove za ono što se provjerava). Ograniči broj primjera u brzim testovima (npr. 50–200), a veći broj stavi pod oznaku sporih testova. Kad test nađe grešku, alat sam smanji primjer: zapiši **najmanji primjer** u nalaz.

**3b. Mutacije (provjera samih testova):** alat namjerno mijenja kod (`>` u `>=`, `+` u `-`, briše red, mijenja zaokruživanje) i pušta testove. Preživjela mutacija znači da testovi ne vide tu grešku. Pokreći samo nad ciljanim modulima (domena, obračun), ne nad cijelim repoom, jer traje dugo; trajanje procijeni i javi prije pokretanja dužeg od ~15 minuta. Za svaku preživjelu mutaciju u važnom kodu predloži test koji bi je ubio. Ekvivalentne mutacije (ne mijenjaju ponašanje) označi i preskoči.

**3c. Simulacija više perioda:** skripta ili test na izmišljenoj organizaciji radi 2–3 perioda (godine) stvarnim tokom aplikacije: unos, obračun, zaključak, prenos. Na kraju svakog perioda zapiši kontrolne zbirove (salda, bilans, obaveze) u CSV/XLSX za ručno poređenje s Excelom ili s knjigovođom. Očekivane brojeve izračunaj nezavisno od koda koji se testira (ručna tabela, drugi način računanja), inače simulacija samo ponavlja grešku.

**3d. Statička analiza:** tipovi (strogo za domenu i servise), sigurnosni linter, Semgrep (ako je dostupan) s pravilima za stack. Prijavi samo stvarne nalaze; pravilo koje daje šum utišaj u konfiguraciji uz razlog, ne po fajlu bez objašnjenja.

**Uz ovo, ugrađeno u Claude Code:** `/code-review` (više nezavisnih pregleda logike po modulima) i `/security-review` (prava pristupa, unos, tajne). Predloži ih za module s najvećim rizikom. Najviši nivo `/code-review` pokreni samo kad ga korisnik ili pravila projekta traže, jer je skup.

## 4. Pravila rada
- **Nikad** ne mijenjaj očekivanje testa da bi prošao, ne preskači i ne briši test, ne smanjuj broj primjera da greška nestane.
- Nađenu grešku zabilježi testom koji je dokazuje, označenim kao očekivani pad (npr. `xfail(strict=True)` u pytestu, `test.fails` u Vitestu, ili ekvivalent), s kratkom oznakom nalaza. Kad se greška ispravi, test prolazi i oznaka se skida.
- Ispravku koda koja mijenja obračun, podatke ili prava pristupa ne radi sam: predloži je i čekaj OK (ili ide kroz `/poslovna-pravila`). Novi testovi i alati smiju u commit.
- Pokreni obavezne provjere projekta (`.agent-checks.json`, `/provjera` ili komande iz `AGENTS.md`) prije commita.

## 5. Izvještaj
Fajl `docs/provjere/DUBINSKA-<YYYY-MM-DD>.md` (ili mjesto koje projekt već koristi za izvještaje):
1. Sažetak: broj nalaza po ozbiljnosti, šta je pokriveno, a šta nije.
2. Nalazi, od najozbiljnijeg: oblast, pravilo (potvrđeno/pretpostavka), najmanji primjer, posljedica u brojevima, test koji ga dokazuje, prijedlog ispravke.
3. Mutacije: rezultat po modulu (ubijene/preživjele/vrijeme) i lista preživjelih u važnom kodu.
4. Statička analiza: nalazi i šta je namjerno utišano.
5. Pitanja za stručnjaka domene (knjigovođa, pravnik...): pravila koja su ostala pretpostavka.
6. Kako ponoviti: tačne komande.

Korisniku javi rezultat u par rečenica, najozbiljniji nalaz prvi, uz link na izvještaj. Nijedan od ovih alata ne zamjenjuje stručnjaka domene: pravila mora potvrditi on.

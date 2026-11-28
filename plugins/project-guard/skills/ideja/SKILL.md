---
name: ideja
description: "Zapisuje ideju van obima u listu ideja (C:\\dev\\ideje, poseban repo), uz prethodnu provjeru da li ideja već postoji, da se ne izgubi i ne zagađuje projekat."
argument-hint: "<ideja u jednoj ili dvije rečenice>"
model: haiku
allowed-tools: [Read, Grep, Glob, Edit, Write, Bash]
---

# /ideja

*Zašto:* dobra ideja usred rada ne smije ni nestati ni ući u projekat u kojem joj nije mjesto, a ista ideja ne treba stajati na dva mjesta. Lista ideja je u zasebnom git repou, pa je ista na desktopu i laptopu.

Ideja: `$ARGUMENTS` (ako je prazno, uzmi zadnji zahtjev koji je čuvar obima označio kao van obima).

## 1. Putanja i svjež pull
- Lista je `<korijen>/ideje/IDEJE.md`. Korijen je prva linija iz `~/.claude/kickstart-korijeni.txt`, a ako fajl ne postoji, `C:\dev`.
- Ako folder `ideje` ne postoji, reci to korisniku i stani. Postavlja se jednom (README repoa `claude-plugins`).
- Prije bilo kakvog čitanja liste: `git -C "<korijen>/ideje" pull --ff-only -q` (samo ako repo ima `origin`). Ako ne uspije, ne popravljaj repo (bez merge, rebase i reset): provjera nije potpuna, a razlog reci korisniku.

## 2. „Imam li ovo već“
Izaberi 3–6 ključnih riječi: stvar, radnja i sinonimi, kao korijen riječi bez nastavka (`podsjet`, ne `podsjetnika`), i bez č/ć/š/ž varijante ako je tekst možda pisan bez njih. Traži bez razlike velikih i malih slova. Pretražuj **svih pet mjesta**, i kad pogodak nađeš na prvom:

| Mjesto | Kako |
|---|---|
| Lista ideja | `<korijen>/ideje/IDEJE.md`, sve sekcije, i `Odbačeno` |
| Oblak ideja (kartice i kandidati, **i odbačeni**) | `git -C "<korijen>/Oblak-ideja" fetch -q`, pa `git -C "<korijen>/Oblak-ideja" grep -i -n -I -e "<riječ1>" -e "<riječ2>" origin/HEAD -- IDEJE.md docs/KANDIDATI.md ideje` |
| Spisak projekata | `<korijen>/claude-licno/projekti.md` |
| Funkcije projekta | `docs/INVENTAR-FUNKCIJA.md` i `docs/VIZIJA.md` trenutnog projekta; ako ideja spominje drugi projekat (ili ga nađeš u spisku projekata), i njegove u `<korijen>/<folder>` |
| Znanje | `<korijen>/claude-licno/znanje/INDEX.md`; otvori najviše 1–3 kartice koje odgovaraju |

- `git grep` koji ne nađe ništa vraća izlaz 1: to znači „nema pogotka“, ne grešku.
- Za svaki pogodak pročitaj cijeli red ili karticu. Ista riječ nije ista ideja: uporedi šta ideja radi i za koga.
- **Nedostupno mjesto** (folder ili fajl ne postoji, `pull` ili `fetch` ne uspije) ne zaustavlja posao: zapamti koje je i zašto. Ako `fetch` ne uspije, pretraži stanje koje postoji lokalno. Projekat bez `docs/INVENTAR-FUNKCIJA.md` je takođe nedostupno mjesto.
- Ne pretražuj internet. Tržište provjerava Oblak ideja, ne ova komanda.

## 3. Ishod (tačno jedan od četiri)
Prva linija odgovora je `Ishod: <naziv>`. Redoslijed provjere: napravljeno, zapisano, slično, novo.

| Ishod | Kad | Šta radiš |
|---|---|---|
| **već napravljeno** | neki projekat to već radi (funkcija je u inventaru kao gotova, ili projekat u spisku radi upravo to) | ne upisuj; pokaži gdje je (fajl i F-broj ili red) |
| **već zapisano** | ista ideja stoji u listi, Oblaku (i kao odbačena) ili u dokumentima projekta kao planirana, a nije napravljena | ne upisuj; pokaži postojeći zapis, a ako je odbačen, i razlog |
| **slično, vlasnik bira** | nešto se preklapa, ali ideja se razlikuje po tome šta radi ili za koga; i kad nisi siguran da je isto | **još ništa ne upisuj**; pokaži slične zapise i razliku, pa pitaj: (1) dopuni postojeći zapis, (2) upiši kao novu, (3) ne upisuj. Čekaj odgovor |
| **novo** | nema ni istog ni sličnog | upiši (korak 4) |

Uz svaki ishod napiši `Tražio sam:` sa svim mjestima koja su stvarno pretražena i `Nije bilo dostupno:` (ili „sve dostupno“). Ako nešto nije bilo dostupno, napiši i **provjera nije potpuna**.

## 4. Upis (ishod „novo“, ili kad vlasnik izabere upis)
1. **Ideja za novu aplikaciju ili igru za prodaju**, a postoji `<korijen>/Oblak-ideja`: ne upisuj je ovdje. Nova aplikacija ili igra (za telefon, web ili računar) ide u Oblak, osim ako korisnik kaže da je lična; kad nije jasno, pitaj prije upisa. Predloži karticu u Oblaku (`npm run nova-ideja -- "Naslov"` u tom folderu), da prođe provjeru tržišta, ocjenu i odluku. Ako korisnik ipak hoće ovdje, nastavi.
2. **Dodaj** na vrh sekcije `## Nove`: `- YYYY-MM-DD · <ideja> _(iz: <ime trenutnog projekta>)_`. Ako neko mjesto nije bilo dostupno, dodaj na kraj istog reda ` · provjera nije potpuna: <šta nije pretraženo>`.
3. **Snimi** (u repou ideja, ne u trenutnom projektu):
   ```bash
   git -C "<korijen>/ideje" add IDEJE.md && git -C "<korijen>/ideje" commit -qm "ideja: <kratko>"
   ```
   Ako repo ima `origin`, uradi i `git -C "<korijen>/ideje" push -q`.
4. Potvrdi u jednoj rečenici i nastavi sa trenutnim radom.

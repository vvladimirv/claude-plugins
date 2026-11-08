---
name: provjera-izgleda
description: "Provjera izgleda u pravom pregledniku: snimci svih ekrana po ulogama i širinama, prelom i preširoki elementi, greške u konzoli, pristupačnost (axe-core), po želji Lighthouse, pa izvještaj s prijedlozima po važnosti. --regresija dodaje vizuelne regresijske testove kad je izgled usvojen."
argument-hint: "[--regresija] [uloga|ekran ili oblast]"
model: sonnet
---

# /provjera-izgleda

*Zašto:* ekran s razbijenim rasporedom i dalje vraća HTTP 200 i prolazi sve testove. Samo pravi preglednik vidi preklapanje, vodoravni prelom, nečitljiv kontrast i polje bez naziva. Ova komanda ništa ne mijenja u aplikaciji: daje snimke, mjerenja i prijedloge. Izmjene idu kroz `/ui-izmjena` (ili postupak projekta) tek uz korisnikov OK.

Zahtjev: `$ARGUMENTS`

## 1. Konfiguracija ekrana
Ako projekt već ima svoju skriptu za snimke ili raspored (npr. `scripts/layout_check.*`), koristi nju i samo dopuni ono što ova komanda daje više (pristupačnost, uloge, širine). Inače napravi `.claude/izgled.json`:

```json
{
  "adresa": "http://127.0.0.1:5000",
  "sirine": [1440, 1280, 1024],
  "visina": 900,
  "uloge": [
    { "ime": "knjigovodja",
      "prijava": { "putanja": "/prijava", "polja": { "#username": "knjigovodja", "#password": "$DEMO_LOZINKA" },
                   "dugme": "button[type=submit]", "cekaj": "/pocetna" } },
    { "ime": "gost" }
  ],
  "ekrani": [
    { "ime": "pocetna", "putanja": "/pocetna" },
    { "ime": "plate", "putanja": "/plate", "uloge": ["knjigovodja"] }
  ],
  "sakrij": [".trenutno-vrijeme"]
}
```

- **Ekrani:** uzmi iz `docs/EKRANI.md` ako postoji, inače iz ruta aplikacije. Za ekran sa podacima koristi demo ili seed podatke projekta, ne prazne liste.
- **Uloge:** svaka uloga koja vidi drugačiji meni ili ekran. `uloge` na ekranu ograničava ko ga snima. Uloga bez `prijava` je neprijavljen korisnik.
- **Širine:** ciljni uređaji iz projekta (`docs/VIZIJA.md`, `docs/DIZAJN-SISTEM.md`, frontend pravila). Mobilnu širinu dodaj samo ako je telefon ciljni uređaj.
- **Lozinke** samo kao `$IME_VARIJABLE` iz okruženja, nikad doslovno u fajlu. `sakrij` maskira dijelove koji se mijenjaju (sat, datum).

## 2. Snimanje
1. Pokreni aplikaciju s demo podacima kako projekt to radi (`AGENTS.md`, `DEVELOPMENT.md`, README).
2. Playwright i axe-core: ako ih projekt nema, instaliraj ih van projekta, da ne mijenjaš njegove zavisnosti: `npm i --prefix ~/.cache/provjera-izgleda playwright axe-core` i `npx --prefix ~/.cache/provjera-izgleda playwright install chromium`.
3. Skripta je u folderu ovog skilla: `<folder ovog skilla>/snimci.js`. Iz korijena projekta: `node <folder ovog skilla>/snimci.js --izlaz <folder>` (opcije: `--config`, `--uloga`, `--ekran`, `--sirina`, `--bez-axe`; `PROVJERA_IZGLEDA_CHROMIUM` = putanja do već instaliranog Chromiuma). Snimci idu van repoa (scratch ili `docs/provjere/izgled-<datum>/` samo ako ih korisnik želi čuvati).
4. Skripta piše `izvjestaj.md` i `izvjestaj.json`: HTTP status, prelom, preširoki elementi, greške u konzoli i pravila pristupačnosti. Izlaz 1 znači da neki ekran nije snimljen; prijavi ga, ne preskači.
5. **Lighthouse** (po želji, za brzinu učitavanja i ocjenu pristupačnosti): `npx lighthouse <adresa ekrana> --only-categories=performance,accessibility --output=json --output-path=<folder>/lh-<ekran>.json --chrome-flags="--headless"`. Za ekran iza prijave Lighthouse treba sesiju; ako to ne ide jednostavno, mjeri samo javne ekrane i reci to.

## 3. Pregled snimaka
Pogledaj **svaki** snimak (Read na PNG), ne samo tabelu. Za svaki ekran ocijeni:
- raspored: šta se preklapa, lomi ili gubi na užoj širini, prazan prostor koji gura važno ispod ekrana;
- brojevi i tabele: poravnanje iznosa udesno, jednak broj decimala, razdvajanje hiljada, zaglavlje vidljivo kod dugih tabela;
- dosljednost: ista radnja ima isto dugme i boju na svim ekranima, poruke istim tonom, isti nazivi kao u `docs/POJMOVI.md`;
- formulari: redoslijed polja prati posao korisnika, oznake uz polja, greška uz polje na koje se odnosi;
- rad samo tastaturom: tab redoslijed i vidljiv fokus (provjeri ručno na 2–3 ključna formulara kroz Playwright `keyboard.press('Tab')` ako je potrebno);
- uloge: korisnik ne vidi meni ili dugme za radnju koju ne smije izvršiti.

## 4. Izvještaj
`docs/provjere/IZGLED-<YYYY-MM-DD>.md` (ili mjesto koje projekt koristi), bez izmjene koda:
1. Sažetak u 3–5 rečenica.
2. Prijedlozi rangirani po važnosti (🔴 smeta radu ili pristupačnosti, 🟡 dosljednost i čitljivost, 🟢 dorada). Uz svaki: ekran(i), širina, uloga, šta je problem, prijedlog i koji token ili komponenta se mijenja. Grupiši isti problem s više ekrana u jednu stavku.
3. Pristupačnost po pravilu iz axe-a (kritično i ozbiljno prvo).
4. Šta nije provjereno (ekrani bez podataka, uloge bez demo naloga, Lighthouse iza prijave).

Korisniku pošalji sažetak, 2–3 najvažnija prijedloga i link na izvještaj. Za novi izgled ponudi `/mockup-izgleda`, a za ispravke `/ui-izmjena`.

## --regresija (tek kad je izgled usvojen)
Vizuelni regresijski testovi pamte kako ekrani izgledaju i padnu kad izmjena nešto slučajno pomjeri. Prije usvajanja izgleda samo smetaju, jer se svaka namjerna izmjena javlja kao greška.
- Dodaj ih u test alat projekta (Playwright `expect(page).toHaveScreenshot()`, ili ekvivalent za Python), za ključne ekrane i jednu do dvije širine, s istim maskama kao `sakrij`.
- Referentne snimke (baseline) pravi u istom okruženju u kojem će testovi raditi (isti OS i fontovi), inače padaju zbog razlike u iscrtavanju.
- Nove ili promijenjene referentne snimke usvoji **tek uz korisnikov OK**, nakon što ih vidi.
- U CI ih stavi odvojeno od brzih testova; ako projekt nema CI, dodaj ih u obavezne provjere samo ako su stabilni lokalno.

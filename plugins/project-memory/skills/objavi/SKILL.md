---
name: objavi
description: "Vodi korisnika korak po korak da aplikacija radi tamo gdje se koristi: samo na ovom računaru (pokretanje dvoklikom), na kućnoj mreži ili na internetu (hosting, telefon). Za \"/objavi\", \"kako da je koristim\", \"stavi je na internet\"."
argument-hint: "[racunar | mreza | internet]"
model: sonnet
allowed-tools: [Read, Write, Edit, Bash, Glob, Grep, AskUserQuestion]
---

# /objavi: aplikacija radi tamo gdje se koristi

**Prvo, projekat bez kickstarta:** ako projekat ima fajl `.claude/bez-kickstarta`, ovu komandu ovdje ne izvršavaj i ništa ne pravi (ni `STATUS.md`, ni `CHANGELOG.md`, ni `docs/*`, ni `.claude/kickstart.json`). Reci korisniku da projekat ima svoj sistem dokumenata i da pravila rada nađe u `AGENTS.md`/`CLAUDE.md` projekta. Ako ta pravila kažu kako se ovaj posao ovdje radi, navedi to u jednoj rečenici. Zatim stani.

*Zašto:* aplikacija koju može pokrenuti samo Claude nije gotova. Korisnik nije programer, pa mu treba jedan jasan način da je sam pokrene ili otvori. Nije svaka aplikacija za internet: objava znači "tamo gdje se koristi", a to je često samo ovaj računar.

Korisnik je napisao: `$ARGUMENTS`

## 1. Gdje se koristi
Pročitaj `docs/VIZIJA.md` (sekcija `## Gdje se koristi`), ADR-ove o hostingu u `docs/adr/`, `docs/ARHITEKTURA.md` i `README.md`. Argument (`racunar`, `mreza`, `internet`) ima prednost. Ako ništa nije zapisano, pitaj (AskUserQuestion), uz objašnjenje u pola rečenice:
- **Samo na ovom računaru:** podaci ostaju kod tebe, a aplikacija radi i bez interneta. Preporuka kad je koristi jedna osoba.
- **Na kućnoj mreži:** otvaraju je i telefon ili drugi računar u kući, preko WiFi-ja. Ovaj računar mora biti upaljen.
- **Na internetu:** radi sa bilo kojeg mjesta, privatno ili javno. Treba hosting.

Odgovor upiši u VIZIJA.md, sekcija `## Gdje se koristi` (napravi je ako fali). Prelazak sa računara ili mreže na internet je promjena obima: prvo `/adr`.

## 2. Priprema (za sva tri načina)
1. `git status` mora biti čist. Ako nije, predloži prvo `/kraj-sesije`.
2. Pokreni brze testove (vidi **Brzi testovi** ispod). Crveno znači stop.
3. Ako aplikacija čuva podatke, nađi gdje (fajl, folder, baza, pregledač) i reci korisniku običnim riječima gdje su i kako napraviti kopiju (backup).

## 3. Samo na ovom računaru
1. Napravi u korijenu projekta `Pokreni.cmd` (na Linuxu i Macu `pokreni.sh`). Skripta:
   - web aplikacija: napravi produkcijski build ako treba, pokrene lokalni server samo na `127.0.0.1` (ne vidi se na mreži) i otvori pregledač na toj adresi,
   - skripta ili CLI: pokrene program i na kraju sačeka taster, da prozor ne nestane prije nego se pročita rezultat,
   - desktop aplikacija: napravi instalacioni paket ako ga stack ima, inače pokretanje kao gore.
   Skripta javlja grešku običnim riječima (npr. "Node.js nije instaliran").
2. Probaj je sam: pokreni skriptu, provjeri da aplikacija radi (otvori adresu u pregledaču), pa je zaustavi.
3. Prečica na radnoj površini: samo ako korisnik kaže "da", jer je to van projekta.
4. Korisniku reci: "dvoklik na `Pokreni.cmd`" i kako se zaustavlja (zatvori prozor).

## 4. Na kućnoj mreži
1. Isto kao 3, ali server sluša na mreži (`0.0.0.0` ili `--host`), a skripta ispiše adresu za telefon: `http://<IP ovog računara>:<port>` (IP iz `ipconfig`, kućna mreža).
2. Kod prvog pokretanja Windows pita za dozvolu mreže. Korisnik je sam odobri, i to **samo za privatne mreže**. Ti ne mijenjaš podešavanja zaštite ni firewalla.
3. Upozori: računar mora biti upaljen, a njegova adresa se može promijeniti. Fiksna adresa u ruteru je opcija koju korisnik radi sam.
4. Bez prijave aplikaciju vidi svako na tom WiFi-ju. Ako su podaci lični, pitaj treba li lozinka. To je nova funkcija, pa ide kroz `/nova-funkcija`.

## 5. Na internetu
1. **Hosting:** ako ADR o hostingu postoji, koristi njega. Inače predloži 2 opcije za ovaj stack (statička stranica ili PWA: npr. Cloudflare Pages, Netlify, GitHub Pages; sa serverom: npr. Render, Fly.io), sa cijenom i limitima besplatnog plana i jednom preporukom, pa odluku zapiši kroz `/adr`.
2. **Ko je vidi:** pitaj da li je javna ili samo za korisnika i porodicu. Ako je privatna, a podaci su lični, zaštita pristupa je obavezna (prijava u aplikaciji ili zaštita koju hosting nudi).
3. **Nalog, prijavu i plaćanje radi korisnik sam.** Ti ne praviš naloge i ne upisuješ lozinke, ključeve ni podatke kartice. Vodi ga po jedan korak: "otvori X, klikni Y, javi mi šta vidiš". Ključevi i tajne idu u podešavanja hostinga (environment variables), nikad u repo.
4. **Prvi deploy tek uz izričito "da"**, jer objava na internetu je javna radnja. Kad hosting to podržava, podesi automatski deploy iz GitHuba, pa svaki push na glavnu granu sam objavi novu verziju.
5. **Provjera:** otvori javnu adresu i provjeri da se aplikacija učita i da osnovna funkcija radi. Ako je PWA, vodi korisnika kroz instalaciju na telefon (Android Chrome: meni ⋮ → Instaliraj aplikaciju; iPhone Safari: Dijeli → Dodaj na početni ekran).

## 6. Zapiši i snimi
1. `README.md`, sekcija `## Kako se koristi`: kako se pokreće ili koja je adresa, gdje su podaci i kako se pravi backup. Najviše 10 linija, za čovjeka koji nije programer.
2. `STATUS.md` i, ako je objava dio milestonea, njegov status u `docs/BLUEPRINT.md`.
3. Commit `chore(objava): <način>`. Push samo uz izričito "da".
4. **Završna poruka:** jedna rečenica kako se aplikacija od sada koristi. Ako je MVP gotov, u `➡️ Sljedeće:` predloži `/izdanje`.

## Brzi testovi
Ako postoji `.agent-checks.json`, koristi runner projekta `node scripts/checks.cjs` (ili `/provjera` iz project-guard). Prije commita stage samo namjeravanih fajlova, pa obnovi dokaz nad tim sadržajem i indeksom. Ne preskači obavezne grupe.

Bez tog plana vrijedi postojeći postupak:
Traži u folderu koji testiraš i uzmi prvo što postoji:
1. `scripts/test` (ili `scripts/test.mjs`, `.js`, `.ps1`),
2. komanda za brze testove iz `AGENTS.md` (sekcija „Komande" ili „Brzi testovi"),
3. `npm run test:fast`, ako `package.json` ima skriptu `test:fast`.

Ako nema ničega, pitaj korisnika koju komandu da pokreneš.

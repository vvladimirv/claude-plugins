---
name: kickstart
description: Ispravan start projekta. Intervju, pojmovi, stack, arhitektura i blueprint, pa temeljni dokumenti, git hookovi i prvi commit. Za nov projekat; --lagano za malu ličnu aplikaciju; --postojeci za projekat sa kodom; --nadogradi za nove šablone ili prelazak na puni.
argument-hint: <tema projekta> [--lagano | --puno] | --postojeci | --nadogradi
---

# /kickstart: ispravan start projekta

Korisnik je pokrenuo: `$ARGUMENTS`

Tvoj zadatak je postaviti temelj projekta koji se kasnije neće morati mijenjati. Radiš u **6 faza** (lagani režim: vidi **Režim lagano**). Nakon faza 1–4 **staneš i tražiš odobrenje** (AskUserQuestion ili jasno pitanje). Ništa ne pišeš na disk prije faze 5.

Korisnik uči kroz rad: uz svaku fazu u 1–2 rečenice objasni **zašto** ta faza postoji (koji problem sprječava). Piši na bosanskom (ijekavica). Kod, identifikatori i imena fajlova koda su na engleskom.

Šabloni su u folderu `templates/` pored ovog SKILL.md fajla. Pročitaj ih prije faze 5.

## Faza 0: provjera foldera (bez pitanja)

1. Radni folder = trenutni direktorij projekta.
2. Ako putanja sadrži `OneDrive`, `Dropbox` ili `Google Drive`: **upozori** da git i sync servis ne idu zajedno (pokvareni `.git`, konflikti). Predloži `C:\dev\<ime>` i pitaj da li nastaviti.
3. **Izbor ciljnog projekta** (za `--nadogradi` i `--postojeci`). Ako trenutni folder nije taj projekat (za `--nadogradi` nema `.claude/kickstart.json`, a za `--postojeci` nema koda), **ne staj**:
   - nađi kandidate: folderi direktno ispod korijena (prva linija iz `~/.claude/kickstart-korijeni.txt`, inače `C:\dev`). Za `--nadogradi` to su oni sa `.claude/kickstart.json` (uz `verzija_sablona`), a za `--postojeci` oni sa kodom, ali bez njega. Folderi sa `.claude/bez-kickstarta` nisu kandidati. Worktree (`.git` je fajl) označi sa "(worktree, grana X)",
   - pitaj koji (AskUserQuestion). Najstarija verzija šablona ide prva,
   - nastavi sa **apsolutnim putanjama** u taj folder. Hookovi (brava, kapija) važe za ciljni folder. Ako u tom folderu radi druga sesija, predloži njen worktree.
4. **Folder svjesno bez kickstarta.** Ako ciljni folder ima `.claude/bez-kickstarta`, projekat ima svoj sistem dokumenata: tamo ništa ne pravi i stani. Reci korisniku da su pravila rada tog projekta u njegovom `AGENTS.md`/`CLAUDE.md`, a da za prelazak na kickstart prvo treba obrisati `.claude/bez-kickstarta`. Ne nudi druge izbore i ne briši marker sam. Izuzetak je nova tema (tačka 6): ona ide u nov folder.
5. Ako je proslijeđen `--nadogradi`: idi na sekciju **Režim --nadogradi** na dnu.
6. **Sesija je u drugom projektu, a tema je nova.** Trenutni folder već ima `.claude/kickstart.json`, `.claude/bez-kickstarta` ili kod, a argument je nova tema (nije `--postojeci`):
   - ne diraj trenutni folder,
   - predloži novi folder `<korijen>/<ime-teme>` (korijen je prva linija iz `~/.claude/kickstart-korijeni.txt`, inače `C:\dev`) i potvrdi ime,
   - napravi folder i nastavi sve faze tamo, sa **apsolutnim putanjama** u taj folder. Hookovi (kapija, brava) važe za ciljni folder,
   - na kraju reci korisniku da otvori novu sesiju u tom folderu za rad na M1.
7. Ako postoji `.claude/kickstart.json`, a argument nije nova tema: projekat je već pokrenut. Ponudi pregled dokumenata ili `--nadogradi`. Ne generiši ništa ponovo.
8. **Režim:** `--lagano` ili `--puno` u argumentu odlučuje odmah (zastavica nije dio teme). Bez zastavice režim se bira u fazi 1, poslije pitanja 6.
9. Ako folder već ima kod (npr. `src/`, `package.json`, `*.py`, `index.html`) ili je proslijeđen `--postojeci`: radi u **režimu postojećeg projekta**:
   - prvo pročitaj postojeći kod i dokumente (README, CLAUDE.md, *.md u korijenu),
   - intervju skrati na ono što se ne vidi iz koda,
   - u fazi 5 **nikad ne prepisuj** postojeće fajlove. Pravi samo one koji fale, a za postojeće predloži izmjene kao diff.

## Faza 1: intervju i rječnik pojmova

*Zašto:* bez jasnog obima projekat raste u svim smjerovima. Bez rječnika agent isti pojam zove na tri načina.

Postavi najviše 8 pitanja, grupisano (AskUserQuestion, do 4 po pozivu). Ne pitaj ono što se vidi iz teme:
1. Koji problem rješava i za koga (ko su korisnici)?
2. Šta je MVP: 3–7 funkcija bez kojih nema smisla?
3. Šta svjesno **nije** u obimu (bar 2 stvari)?
4. Gdje radi: web, mobitel (PWA), desktop, skripta/CLI, servis?
5. Podaci: odakle dolaze, da li su lični ili osjetljivi, gdje se čuvaju?
6. Ko ga koristi: samo ti, mala grupa ili javno? Treba li prijava?
   - Bez `--lagano`/`--puno`, odmah poslije odgovora pitaj (AskUserQuestion): **"Lagani ili puni start?"**. Za aplikaciju samo za korisnika, bez roka i bez tuđih podataka preporuči "Lagano" (prva opcija): samo VIZIJA, STATUS, AGENTS i CLAUDE, bez plana sa rokovima. Inače preporuči "Puno". Na "Lagano" nastavi po **Režim lagano**.
7. Gdje se koristi: samo na ovom računaru, na kućnoj mreži (i telefon u kući) ili na internetu? Nije svaka aplikacija za internet: kad je koristi jedna osoba, a podaci su lični, preporuči ovaj računar. Odgovor ide u VIZIJA.md → `## Gdje se koristi` (čita ga `/objavi`).
8. Ima li rok ili ograničenje (budžet, postojeći sistem s kojim se povezuje)?

Zatim predloži **rječnik pojmova**: 5–12 ključnih pojmova domene sa definicijom od jedne rečenice i engleskim imenom za kod (npr. "Račun (Invoice): …"). Korisnik ga potvrdi ili ispravi.

Na kraju faze: sažetak u 5–8 linija (problem, korisnici, MVP, van obima, pojmovi) → čekaj "OK".

## Faza 2: stack

*Zašto:* stack se najteže mijenja kasnije, pa odluka mora imati zapisan razlog.

- Predloži **2–3 opcije** u tabeli: stack, za šta je dobar, mane, složenost za održavanje, cijena hostinga.
- Daj **jednu preporuku** i razlog vezan za odgovore iz intervjua. Najjednostavnije rješenje koje pokriva MVP je obično najbolje. Ne predlaži mikroservise, Kubernetes i slično za projekt jednog čovjeka.
- Navedi test alat za taj stack (brza traka < 5 min) i, ako ima UI, alat za screenshot testove (Playwright).
- Čekaj izbor. Odluka postaje ADR 0001.

## Faza 3: arhitektura

*Zašto:* bez granica agent sve dodaje u fajl koji je već otvoren, pa nastaju monoliti od 3000 linija.

Predloži:
1. **Organizaciju po funkcijama**: `src/features/<funkcija>/` sadrži prikaz, logiku i test zajedno, a `src/shared/` zajedničko. Prilagodi konvencijama stacka, ali princip ostaje.
2. **Tri sloja** u svakoj funkciji: prikaz · logika (čiste funkcije) · podaci (API/baza).
3. **Mermaid dijagram** modula i toka podataka.
4. **Stablo foldera** (do 3 nivoa).
5. **Granice**: limit fajla 300 linija (upozorenje) / 500 (obavezna podjela). Gdje žive tajne (`.env`, nikad u repou), a gdje stvarni podaci (izvan repoa, u repou samo `fixtures/`).
6. Ako ima UI: **dizajn sistem** (jedan fajl tokena, katalog komponenti) i lista ekrana.

Prije nego pokažeš prijedlog, pošalji ga agentu **`arhitekta`** (Agent tool; agent iz plugina project-kickstart) zajedno sa sažetkom iz faza 1–2. Ispravi sve 🔴 stavke, a korisniku pokaži prijedlog i kratko šta je arhitekta promijenio. Ako agent nije dostupan, sam provjeri:
- Da li je išta složenije nego što MVP traži?
- Da li svaka MVP funkcija ima svoje mjesto?
- Da li postoji fajl za koji se već vidi da će postati monolit?
- Da li se osjetljivi podaci mogu slučajno commitovati?

Čekaj "OK".

## Faza 4: blueprint

*Zašto:* inventar funkcija je ugovor. Redizajn je gotov tek kad sve funkcije iz inventara i dalje rade.

Predloži:
- **Inventar funkcija**: F-01, F-02… (ime, opis u jednoj rečenici, ekran ako ima UI, kako se testira).
- **Milestones**: M1 (kostur koji se pokreće + prvi test), M2 … (svaki 1–3 radna dana, svaki završava nečim što radi).
- **Tempo i rokovi** *(zašto: bez roka milestone je želja, a rad traje beskonačno)*: pitaj koliko sati sedmično korisnik radi na projektu i ima li krajnji rok. Radni dan računaj kao ~6 sati rada sa agentom. Iz tempa izračunaj `Rok` za svaki milestone i datum završetka MVP-a. Ako je krajnji rok raniji od prognoze, **smanji obim odmah**: predloži koje funkcije idu u `odloženo (v2)` (ne produžavaj rok tiho).
- **Ciljnu liniju**: kad je MVP gotov (sekcija `## Cilj: MVP gotov` u BLUEPRINT.md), slijedi `/izdanje`.
- **Prvih 5 zadataka** za M1.
- **Definiciju "gotovo"**: testovi zeleni, STATUS.md ažuriran, commit.

Čekaj "OK".

## Faza 5: generisanje fajlova

*Zašto:* jedna tema = jedan fajl. Pravila, stanje i historija žive odvojeno, pa se dokumenti ne proturječe.

Pročitaj sve šablone iz `templates/` i napravi fajlove u projektu. Popuni ih sadržajem iz faza 1–4, ne ostavljaj `{{…}}` placeholdere i obriši sve `<!-- UPUTA: … -->` komentare.

| Šablon | Cilj u projektu | Kad |
|---|---|---|
| `AGENTS.md` | `AGENTS.md` | uvijek |
| `CLAUDE.md` | `CLAUDE.md` | uvijek |
| `STATUS.md` | `STATUS.md` | uvijek |
| `README.md` | `README.md` | uvijek |
| `docs/VIZIJA.md` | `docs/VIZIJA.md` | uvijek |
| `docs/POJMOVI.md` | `docs/POJMOVI.md` | uvijek |
| `docs/ARHITEKTURA.md` | `docs/ARHITEKTURA.md` | uvijek |
| `docs/BLUEPRINT.md` | `docs/BLUEPRINT.md` | uvijek |
| `docs/INVENTAR-FUNKCIJA.md` | `docs/INVENTAR-FUNKCIJA.md` | uvijek |
| `docs/PRAVILA-KODA.md` | `docs/PRAVILA-KODA.md` | uvijek |
| `docs/adr/0001-izbor-stacka.md` | `docs/adr/0001-izbor-stacka.md` | uvijek |
| `docs/DIZAJN-SISTEM.md` | `docs/DIZAJN-SISTEM.md` | samo ako ima UI |
| `docs/EKRANI.md` | `docs/EKRANI.md` | samo ako ima UI |
| `fixtures/README.md` | `fixtures/README.md` | uvijek |
| `claude-settings.json` | `.claude/settings.json` | uvijek (dopuni komandama za testove tog stacka) |
| `gitignore` | `.gitignore` | uvijek (dopuni za stack) |
| `gitattributes` | `.gitattributes` | uvijek (isti krajevi linija na svim računarima) |
| `githooks/pre-commit` + `githooks/pre-commit.mjs` | `.githooks/` (oba) | uvijek (bez izmjena) |
| `github-ci.yml` | `.github/workflows/ci.yml` | uvijek (ostavi blok izabranog stacka, E2E samo ako ima UI) |

Zatim napravi **kostur foldera** iz faze 3: prazni folderi sa `.gitkeep`. Ne piši aplikacijski kod, to je posao milestone-a M1.

Napravi i **`scripts/test.mjs`**, Node skriptu za svaki stack: Node je već potreban za git hookove, pa ista skripta radi na Windowsu, Linuxu i Macu (`.ps1` bi na Linuxu i Macu tražio `pwsh`). Skripta pokrene brze testove sa tihim reporterom (npr. `pytest -q --tb=short`, `vitest run --reporter=dot`, `playwright test --reporter=line`), upiše pun izlaz u `test-log.txt` (dodaj ga u `.gitignore`), a na ekran ispiše samo sažetak i, ako testovi padnu, najviše 40 linija grešaka. Izlazni kod mora biti isti kao kod test runnera. Kad još nema nijednog testa, skripta vraća 0 (npr. `vitest run --passWithNoTests`, a za pytest izlazni kod 5 znači "nema testova"), jer je pokreće i pre-commit. *Zašto:* testovi ne troše tokene, ali njihov izlaz troši, kad ga agent čita.

Pravila za sadržaj:
- `AGENTS.md` ima zajednička pravila za sve agente (Claude, Codex). `CLAUDE.md` ga samo uvozi (`@AGENTS.md`) i dodaje ono što je specifično za Claude. Oba zajedno ispod 80 linija.
- `STATUS.md` ima samo trenutno stanje, najviše 30 linija. Historija je u git logu.
- Ništa ne dupliraj: ako je nešto u `docs/ARHITEKTURA.md`, drugi fajlovi samo linkuju na njega.

Na kraju napravi `.claude/kickstart.json`:
```json
{ "status": "gotovo", "datum": "<YYYY-MM-DD>", "verzija_sablona": "0.4.4", "rezim": "puno", "faza": "razvoj", "izdanja": [], "ui": <true|false>, "stack": "<kratko>" }
```

## Faza 6: git start

*Zašto:* commit je save point. Prvi commit je čist temelj na koji se uvijek možeš vratiti.

1. Ako nema `.git`: `git init -b main`.
2. Uključi git hookove: `git config core.hooksPath .githooks`.
3. `git add -A`, zatim `git update-index --chmod=+x .githooks/pre-commit` (hook je tada izvršan i u klonu na Linuxu i Macu). Na Linuxu i Macu uradi i `chmod +x .githooks/pre-commit`: git preskoči hook bez izvršnog bita, pa commit prođe bez provjera. Zatim provjeri `git status`: u stagingu ne smije biti `.env`, `data/` ni stvarnih podataka.
4. Commit: `chore: kickstart – temeljni dokumenti i struktura`. Pre-commit se pokreće već ovdje. Ako odbije, popravi uzrok. Nikad ne koristi `--no-verify`.
5. Pitaj da li napraviti GitHub repo (privatni). Ako `gh` nije instaliran, daj uputstvo za ručno pravljenje repoa i `git remote add origin …` + `git push -u origin main`. Ništa ne pushaj bez izričitog "da".

## Završna poruka

Kratko, u tabeli: šta je napravljeno (fajlovi), šta je prvi zadatak iz M1 i koja je sljedeća komanda. Dodaj jednu liniju: "Podsjetnik rada: `/pomoc`".

## Režim --nadogradi

*Zašto:* plugin se razvija. Projekti pokrenuti starijim šablonima treba da dobiju nova pravila i fajlove, ali bez gubljenja vlastitog sadržaja.

1. Pročitaj `.claude/kickstart.json` ciljnog projekta (Faza 0, tačka 3). Ako ga nema ni u jednom kandidatu, predloži `--postojeci`. Ako je `"rezim": "lagano"`, prvo pitaj (AskUserQuestion): **"Samo nove verzije šablona ili prelazak na puni?"** sa "Samo šabloni" (prva) / "Prelazak na puni". Za prelazak vidi **Režim lagano → Prelazak na puni**. Kad polja `rezim` nema, projekat je puni.
2. Pročitaj `templates/CHANGELOG-SABLONA.md`. Izdvoji sve verzije novije od `verzija_sablona` u projektu.
3. Za svaku stavku napravi plan (u laganom projektu preskoči stavke za fajlove koje lagani nema, npr. BLUEPRINT ili CI): **nov fajl** se pravi iz šablona i popunjava podacima projekta (stack i komande iz AGENTS.md i ADR 0001). **Postojeći fajl** dobija samo minimalan dodatak (diff), a postojeći tekst se ne mijenja.
4. Pokaži plan kao listu diffova i čekaj OK.
5. Primijeni, postavi `verzija_sablona` na trenutnu verziju i commituj: `chore: nadogradnja temelja <stara> → <nova>`.

## Režim lagano

*Zašto:* mala lična aplikacija ne treba plan sa rokovima, inventar ni arhitekturu na papiru. Previše dokumenata se ne održava, pa zastari i smeta. Lagani start zadrži ono što štiti (obim, stanje, pravila, tajne, testovi) i ništa više.

1. **Faza 1:** samo pitanja 1–4 i 7 (problem i korisnici, MVP sa 3–5 stavki, van obima, gdje radi, gdje se koristi). Bez rječnika pojmova.
2. **Faza 2:** jedna preporuka stacka i jedna alternativa, svaka u jednoj rečenici. Tabela i ADR otpadaju.
3. **Faze 3 i 4** otpadaju. Prije faze 5 pokaži sažetak (problem, MVP, van obima, stack) i čekaj jedan "OK".
4. **Faza 5**, samo ovi fajlovi (ostali iz tabele se ne prave):
   - `AGENTS.md`, `CLAUDE.md`, `STATUS.md`, `README.md`, `docs/VIZIJA.md`, `.claude/settings.json`, `.gitignore`, `.gitattributes`, `.githooks/` (oba), `scripts/test.mjs`,
   - `AGENTS.md` iz šablona, ali skraćen: u „Gdje je šta" samo VIZIJA, STATUS i git log; ispod naslova linija `Stack: <izbor>, jer <razlog>`; bez pravila **Pojmovi**; **Struktura** glasi „novi kod prati postojeću strukturu foldera, jedan fajl = jedna odgovornost"; **Zavisnosti** glasi „nova biblioteka samo uz OK korisnika, upiši je u liniju Stack"; u „Komande" bez punih testova ako nema CI,
   - `STATUS.md` umjesto milestonea ima `**Cilj:** MVP iz docs/VIZIJA.md → Obim`,
   - bez kostura foldera, `fixtures/`, `docs/adr/` (pravi ga `/adr` kad zatreba) i CI,
   - `.claude/kickstart.json` kao gore, ali sa `"rezim": "lagano"`.
5. **Faza 6** i završna poruka kao gore. Dodaj liniju: „Kad projekat poraste: `/kickstart --nadogradi` → prelazak na puni."

### Prelazak na puni
Radi kao režim postojećeg projekta (Faza 0, tačka 9): pročitaj kod i postojeće dokumente, pitaj samo ono što se ne vidi (pojmovi, tempo i rok), pa faze 3 i 4 sa odobrenjem. U fazi 5 napravi samo fajlove koji fale. Postojeće fajlove ne prepisuj, nego predloži diff (npr. puna pravila u AGENTS.md). Na kraju `"rezim": "puno"` u kickstart.json i commit `chore: kickstart lagano → puno`.


# Izmjene šablona (za `/kickstart --nadogradi`)

Nova verzija ide na vrh. Svaka stavka kaže koji fajl u projektu i šta tačno treba dodati. Nadogradnja nikad ne prepisuje sadržaj projekta: samo dodaje ono što fali.

## 0.4.4
- **AGENTS.md**, sekcija `## Pravila`: novo pravilo **Isti problem drugdje** (tekst iz šablona), poslije pravila o paralelnom radu. Ako projekat ima UI pravilo, ono ide poslije novog i dobija sljedeći broj. Ako projekat već ima isto pravilo drugim riječima (u AGENTS.md ili CLAUDE.md), ne dodaji drugo.

## 0.4.3
- **docs/VIZIJA.md**: nova sekcija `## Gdje se koristi` između `## Van obima` i `## Uspjeh znači`, sa jednom linijom: samo na ovom računaru, na kućnoj mreži ili na internetu, i na kojim uređajima. Popuni je iz ADR-ova o hostingu i ARHITEKTURA.md. Ako nije jasno, pitaj korisnika. Čita je `/objavi`.

## 0.4.2
- **.githooks/pre-commit** mora biti izvršan: git ga na Linuxu i Macu bez toga preskoči, pa commit prođe bez provjera. Provjeri `git ls-files -s .githooks/pre-commit`: mod mora biti `100755`. Ako nije: `git update-index --chmod=+x .githooks/pre-commit`, a na Linuxu i Macu i `chmod +x .githooks/pre-commit`. Ako je hook dodan na Windowsu (kickstart ili nadogradnja na 0.3.0+), mod je već `100755`.
- **.githooks/pre-commit.mjs**, blok "3. Brzi testovi": `.ps1` na Linuxu i Macu ide preko `pwsh`, a kad se test skripta ne može pokrenuti, poruka to kaže (ranije je pisalo "nije prošao"). Prenesi izmjenu iz šablona, a ostale provjere u fajlu ne diraj.
- **scripts/test.mjs**: ako projekat ima samo `scripts/test.ps1`, predloži `scripts/test.mjs` sa istim ponašanjem (pre-commit ga bira prije `.ps1`) i komandu `node scripts/test.mjs` u AGENTS.md. `.ps1` obriši tek uz OK.

## 0.4.1
- **.github/workflows/ci.yml** (iz `github-ci.yml`):
  - package manager po lockfile-u: pnpm (`pnpm/action-setup` + `pnpm install --frozen-lockfile`) ili npm (`npm ci`),
  - artefakt palih E2E testova je `test-results/`, jer uz `--reporter=line` folder `playwright-report/` ne nastaje,
  - E2E ide sa `--ignore-snapshots` dok u repou nema `*-linux.png` snimaka,
  - ručno pokretanje "snimci" (`workflow_dispatch`) pravi Linux referentne snimke kao artefakt `linux-snimci`.
  Postojeći ci.yml uporedi sa šablonom i predloži samo razlike.

## 0.4.0
- **docs/BLUEPRINT.md**, tabela milestonea: dodati kolone `Rok` i `Status`. `Status` popuni iz inventara i git loga: `gotovo YYYY-MM-DD` (datum commita kojim je milestone završen), `u toku` ili `planirano`. `Rok` pitaj samo za preostale milestonee (tempo: sati sedmično).
- **docs/BLUEPRINT.md**: nove sekcije `## Tempo` (početak, sati sedmično) i `## Cilj: MVP gotov` (iz šablona).
- **docs/INVENTAR-FUNKCIJA.md**: linija sa statusima dobija `odloženo (v2)` i objašnjenje (iz šablona).
- **.claude/kickstart.json**: dodati `"faza": "razvoj"` i `"izdanja": []`. Ako je projekat već izdat (postoji git tag `v*`), upiši izdanje i `"faza": "odrzavanje"`.

## 0.3.0
- **Nov:** `.githooks/pre-commit` + `.githooks/pre-commit.mjs` (iz `githooks/`). Zatim `git config core.hooksPath .githooks` i `git update-index --chmod=+x .githooks/pre-commit`, a na Linuxu i Macu i `chmod +x .githooks/pre-commit`.
- **Nov:** `.github/workflows/ci.yml` (iz `github-ci.yml`, prilagođen stacku).
- **AGENTS.md**, pravilo 10 (Paralelni rad): dodati rečenicu o `.agent-lock.json` i Codex worktreeu.
- **AGENTS.md**, pravilo 5 (Testovi): brzi testovi idu preko `scripts/test`, a E2E i screenshot testovi u CI (ako fali).

## 0.2.0
- **CLAUDE.md:** linija sa komandama `/nova-funkcija`, `/ui-izmjena`, `/ideja`.

## 0.1.0
- Početni skup: AGENTS.md, CLAUDE.md, STATUS.md, README.md, docs/ (VIZIJA, POJMOVI, ARHITEKTURA, BLUEPRINT, INVENTAR-FUNKCIJA, PRAVILA-KODA, adr/0001, DIZAJN-SISTEM i EKRANI za UI), fixtures/README.md, .claude/settings.json, .gitignore, .gitattributes, scripts/test.

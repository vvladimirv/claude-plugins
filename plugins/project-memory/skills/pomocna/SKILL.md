---
name: pomocna
description: Samostalan zadatak ide u pomoćnu sesiju (svoj worktree): kartica sa gotovim promptom, a pomoćna na kraju sama testira, spoji u baznu granu i zatvori se. "/pomocna <zadatak>".
argument-hint: "<zadatak>"
model: haiku
allowed-tools: [Bash, Read, AskUserQuestion, ToolSearch, mcp__ccd_session__spawn_task]
---

# /pomocna: zadatak za pomoćnu sesiju

*Zašto:* glavna sesija vodi posao i ostaje otvorena. Samostalan zadatak (može se uraditi bez korisnika, usput) radi pomoćna sesija u svom worktreeu (posebna kopija projekta u svom folderu, sa svojom bravom). Kad završi, sama spoji rad i zatvori se, a korisnik ništa ne prebacuje ručno.

Zadatak: `$ARGUMENTS`. Ako je prazno, uzmi zadatak o kojem se upravo pričalo; ako ga nema, pitaj.

1. **Provjere** (iz korijena projekta):
   - `git rev-parse --show-toplevel`. Ako ovo nije git repo, reci da pomoćna sesija treba git i stani.
   - `git remote get-url origin` i `gh auth status`. Ako nešto od toga ne radi, pomoćna neće moći sama spojiti rad. Reci to jednom rečenicom i pitaj (AskUserQuestion) da li ipak praviti karticu: "Da, napravi" / "Ne".
2. **Bazna grana** je grana na kojoj je glavna sesija sada: `git branch --show-current` (prazno → `main`). U nju pomoćna spaja svoj rad. Ako je korisnik otvorio posebnu granu da ne dira `main` dok ne provjeri izmjene, `main` ostaje netaknut.
   - Provjeri da je bazna grana na GitHubu: `git ls-remote --exit-code --heads origin <bazna>`. Ako nije, pitaj: "Pushujem granu <bazna> na GitHub?" sa opcijama "Da, pushuj" / "Ne, bez kartice". Push samo uz "da".
   - Ako bazna grana ima commitove koji nisu na GitHubu (`git status -sb` pokazuje `ahead`), pomoćna ih neće vidjeti. Pitaj da li da ih pushujem prije kartice.
3. **Kartica:** ako alat nije učitan, ToolSearch `select:mcp__ccd_session__spawn_task`. Pozovi `spawn_task`:
   - `cwd`: korijen glavnog repoa (folder iznad `git rev-parse --path-format=absolute --git-common-dir`). Aplikacija sama pravi svjež worktree. `cwd` šalji samo ako ga shema alata ima; ako ga nema (cloud sesija, `CLAUDE_CODE_REMOTE=true`), prvi red prompta je `Korijen projekta: <putanja>`.
   - `title`: zadatak kao naredba (< 60 znakova). `tldr`: jedna-dvije rečenice bez žargona: zašto sada i šta će pomoćna uraditi.
   - `prompt` mora stajati sam za sebe: zadatak, bitan kontekst iz ove sesije (šta je urađeno, odluke korisnika, fajlovi), bez tajni i ključeva, pa na kraju ovaj blok sa upisanom baznom granom:
     ```text
     Ti si pomoćna sesija u svom worktreeu. Bazna grana: <bazna>.
     Na startu: `git fetch origin`; ako worktree nema izmjena ni svojih commitova, `git reset --hard origin/<bazna>`.
     STATUS.md ne diraj (piše ga samo glavna sesija).
     Kad je zadatak gotov i provjeren, sam pokreni `/kraj-sesije auto <bazna>`.
     Ako zadatak traži odluku korisnika, pitaj i ne zatvaraj se.
     ```
   - Ako `spawn_task` ne postoji ili javi grešku: ispiši prompt u bloku koda i reci „Otvori novu sesiju u worktreeu ovog projekta i zalijepi ovo."
4. **Javi** jednom rečenicom: „Kartica za pomoćnu sesiju je ispod. Kad završi, sama spoji rad u <bazna> i zatvori se, a ti dobiješ obavještenje." Glavna sesija se ne arhivira i radi dalje.
5. **Kad pomoćna spoji rad** (guard javi novi commit, ili korisnik kaže da je stiglo obavještenje): `git pull --ff-only`, pa osvježi STATUS.md po pravilima iz `/stanje`. STATUS.md piše samo glavna sesija.

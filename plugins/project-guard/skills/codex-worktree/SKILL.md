---
name: codex-worktree
description: Poseban worktree i grana za Codex ili drugi chat; "spoji <zadatak>" vraća gotov rad preko PR-a (ili lokalnog merge-a) u granu iz koje je nastao.
argument-hint: <zadatak> | spoji <zadatak>
model: haiku
allowed-tools: [Bash, Read, AskUserQuestion]
---

# /codex-worktree

*Zašto:* dva agenta u istom folderu prepisuju jedan drugom fajlove. Worktree je drugi folder sa svojom granom iz istog repoa: Codex radi tamo, Claude ovdje, a git ih spoji kad je rad gotov. Jedan agent = jedan worktree = jedna grana.

Argument: `$ARGUMENTS`

## Novi worktree (`<zadatak>`)
1. Ime zadatka pretvori u kratak slug (`izvoz-csv`). Projekat = ime trenutnog foldera.
2. Provjeri da nema necommitovanih izmjena (`git status --short`). Ako ih ima, predloži commit prije grananja.
3. Bazna grana = trenutna grana (`git branch --show-current`), ne nužno `main`. Ako je prazno (odvojen HEAD), stani i pitaj.
4. Napravi worktree od trenutnog HEAD-a i zapamti baznu granu i zadatak (vidi ih `/grane`):
   ```bash
   git worktree add "../<projekat>-codex-<zadatak>" -b "codex/<zadatak>"
   git config "branch.codex/<zadatak>.base" "<bazna grana>"
   git config "branch.codex/<zadatak>.zadatak" "<zadatak u jednoj rečenici>"
   ```
5. Poruka korisniku:
   - otvori folder `../<projekat>-codex-<zadatak>` u Codex aplikaciji i daj mu zadatak,
   - Codex čita `AGENTS.md` (ista pravila kao Claude),
   - kad Codex završi i commituje, ovdje pokreni `/codex-worktree spoji <zadatak>`. Rad se vraća u `<bazna grana>`.

## Spajanje (`spoji <zadatak>`)
0. **Postoji li već PR?** Ako repo ima `origin` na GitHubu i `gh` radi (`gh auth status`): `gh pr view "codex/<zadatak>" --json state,url,headRefOid`.
   - `MERGED`: idi na **Poslije spajanja PR-a** ispod i zapamti `headRefOid` (zadnji commit grane u PR-u).
   - `OPEN`: pokaži link i reci da PR čeka tvoj pregled i Merge na GitHubu. Stani.
   - nema PR-a: nastavi.
1. `git -C "../<projekat>-codex-<zadatak>" status --short`: ako ima necommitovanog rada, stani i reci korisniku.
2. Bazna grana: `git config --get "branch.codex/<zadatak>.base"`. Ako je ista kao trenutna (`git branch --show-current`), to je `<baza>`. Ako je druga, ili zapisa nema (worktree iz starije verzije), stani i pitaj u koju granu da spojiš. Na drugu granu se prebaci (`git switch`) samo uz čist `git status`.
3. Pokaži šta je urađeno: `git log --oneline <baza>..codex/<zadatak>` i `git diff --stat <baza>...codex/<zadatak>`.
4. Pokreni brze testove u tom worktreeu (vidi **Brzi testovi** ispod). Ako su crveni, ne spajaj. Ako komanda padne zato što u worktreeu fale zavisnosti (npr. nema `node_modules`), to nije crven test: pitaj da li da ih instaliraš (`npm ci`).
5. **Način spajanja.** PR je preporuka kad repo ima `origin` na GitHubu i `gh` radi. Inače koristi lokalni merge (korak 7).
   *Zašto PR:* na GitHubu vidiš cijeli diff, CI (ako je uključen) provjeri testove, a Merge klikneš ti. Kad se PR spoji, Claude sesija vezana za njega se sama arhivira (postavka aplikacije).
6. **PR tok** (push izlazi na GitHub, pa pitaj za OK):
   - bazna grana mora postojati na GitHubu (`git ls-remote --heads origin <baza>`). Ako ne postoji, pitaj da li da je pushujem ili da spojim lokalno,
   - `git push -u origin "codex/<zadatak>"`,
   - `gh pr create --base "<baza>" --head "codex/<zadatak>" --title "<zadatak>: <šta je urađeno, jedna rečenica>" --body "<opis>"`. Opis ima: listu commitova (`git log --oneline <baza>..codex/<zadatak>`), F-funkcije i stanje brzih testova. Završava linijom `🤖 Generated with [Claude Code](https://claude.com/claude-code)`,
   - pokaži link PR-a i reci: pregledaj *Files changed*, sačekaj CI (ako radi) i klikni **Merge**. Poslije toga pokreni `/codex-worktree spoji <zadatak>`, koji onda samo počisti.
7. **Lokalni merge** (bez GitHuba): pitaj za OK, pa `git merge --no-ff codex/<zadatak> -m "merge: codex/<zadatak>"`. Kod konflikta stani i pokaži fajlove. Zatim `git worktree remove "../<projekat>-codex-<zadatak>"` i `git branch -d codex/<zadatak>` (briše i zapis bazne grane).

## Poslije spajanja PR-a
1. Ako je `git status` čist: `git switch <baza>` i `git pull --ff-only`, da spojeni rad stigne lokalno.
2. `git worktree remove "../<projekat>-codex-<zadatak>"`, pa `git branch -d "codex/<zadatak>"`.
   - Ako `-d` odbije ("not fully merged"), to je očekivano kad je PR spojen squashom ili rebaseom: na `<baza>` se upisuju novi commitovi umjesto originalnih sa grane, pa git granu ne vidi kao spojenu. Provjeri da na grani nema ničega izvan PR-a: `git rev-parse "codex/<zadatak>"` mora biti isto što i `headRefOid` iz koraka 0 sekcije **Spajanje**. Ako jeste, sav rad je u spojenom PR-u i `git branch -D "codex/<zadatak>"` je siguran.
   - Ako nije isto (ili `headRefOid` nemaš), pokaži `git log --oneline -5 "codex/<zadatak>"` i ne koristi `-D` bez pitanja.
3. Obriši granu i na GitHubu, ako je još tu: `git push origin --delete "codex/<zadatak>"`. Greška znači da ju je GitHub već obrisao (postavka repoa *Automatically delete head branches* to radi sama).
4. Reci korisniku da zatvori prozor tog zadatka u Codex aplikaciji. Claude sesije vezane za PR se arhiviraju same.

## Brzi testovi
Traži u folderu koji testiraš i uzmi prvo što postoji:
1. `scripts/test` (ili `scripts/test.mjs`, `.js`, `.ps1`),
2. komanda za brze testove iz `AGENTS.md` (sekcija „Komande" ili „Brzi testovi"),
3. `npm run test:fast`, ako `package.json` ima skriptu `test:fast`.

Ako nema ničega, pitaj korisnika koju komandu da pokreneš.

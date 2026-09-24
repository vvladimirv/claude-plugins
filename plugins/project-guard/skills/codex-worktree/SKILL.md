---
name: codex-worktree
description: Poseban worktree i grana za Codex ili drugi chat; "spoji <zadatak>" vraća gotov rad u granu iz koje je nastao.
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
4. Napravi worktree od trenutnog HEAD-a i zapamti baznu granu:
   ```bash
   git worktree add "../<projekat>-codex-<zadatak>" -b "codex/<zadatak>"
   git config "branch.codex/<zadatak>.base" "<bazna grana>"
   ```
5. Poruka korisniku:
   - otvori folder `../<projekat>-codex-<zadatak>` u Codex aplikaciji i daj mu zadatak,
   - Codex čita `AGENTS.md` (ista pravila kao Claude),
   - kad Codex završi i commituje, ovdje pokreni `/codex-worktree spoji <zadatak>`. Rad se vraća u `<bazna grana>`.

## Spajanje (`spoji <zadatak>`)
1. `git -C "../<projekat>-codex-<zadatak>" status --short`: ako ima necommitovanog rada, stani i reci korisniku.
2. Bazna grana: `git config --get "branch.codex/<zadatak>.base"`. Ako je ista kao trenutna (`git branch --show-current`), to je `<baza>`. Ako je druga, ili zapisa nema (worktree iz starije verzije), stani i pitaj u koju granu da spojiš. Na drugu granu se prebaci (`git switch`) samo uz čist `git status`.
3. Pokaži šta je urađeno: `git log --oneline <baza>..codex/<zadatak>` i `git diff --stat <baza>...codex/<zadatak>`.
4. Pokreni brze testove u tom worktreeu (vidi **Brzi testovi** ispod). Ako su crveni, ne spajaj. Ako komanda padne zato što u worktreeu fale zavisnosti (npr. nema `node_modules`), to nije crven test: pitaj da li da ih instaliraš (`npm ci`).
5. Pitaj za OK, pa: `git merge --no-ff codex/<zadatak> -m "merge: codex/<zadatak>"`. Kod konflikta stani i pokaži fajlove.
6. Nakon uspješnog spajanja: `git worktree remove "../<projekat>-codex-<zadatak>"` i `git branch -d codex/<zadatak>` (briše i zapis bazne grane).

## Brzi testovi
Traži u folderu koji testiraš i uzmi prvo što postoji:
1. `scripts/test` (ili `scripts/test.mjs`, `.js`, `.ps1`),
2. komanda za brze testove iz `AGENTS.md` (sekcija „Komande" ili „Brzi testovi"),
3. `npm run test:fast`, ako `package.json` ima skriptu `test:fast`.

Ako nema ničega, pitaj korisnika koju komandu da pokreneš.

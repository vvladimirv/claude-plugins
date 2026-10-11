# STATUS

**Ažurirano:** 2026-10-11 · **Talas:** D završen, ispravke po nalazima iz rada

## Radi
- `project-kickstart` 0.4.11: `/kickstart` (+ `--postojeci`, `--nadogradi`, iz drugog foldera pita za ciljni projekat), faza 4 računa rokove iz tempa, `/nova-funkcija`, `/ui-izmjena`, `/adr`, `/pomoc`, agenti `arhitekta` i `ux-recenzent`, šabloni 0.4.4 (pravilo "isti problem drugdje", VIZIJA → Gdje se koristi, rokovi, status, cilj MVP, pre-commit i `scripts/test.mjs` i na Linuxu/Macu, CI za pnpm/npm + Linux snimci)
- `project-memory` 0.4.3: SessionStart kontekst + linija napretka + pravilo „➡️ Sljedeće:“ (vodi korisnika korak po korak), upozorenje na veliku sesiju (~100k i ~150k tokena), `/vrati` (stash ili revert, uvijek povratno), `/objavi` (računar, kućna mreža ili internet), `/stanje`, `/kraj-sesije` (push uz da, pa ponudi novu sesiju sa prvom stavkom iz „Sljedeće" ili zatvaranje; ako je ostaviš otvorenu, oslobodi bravu), `/napredak [html]`, `/izdanje`, `/docs-audit`
- `project-guard` 0.4.4: tajne, kapija, brava (i za `cd X &&` / `git -C X`; čitanje preko `gh pr list/view`, `sed -n`, `git -C X log` ne uzima bravu), **sinhronizacija** (repo iza GitHuba → pisanje čeka pull; tuđi commit → jednom stani), limit fajlova, tokeni, čuvar obima + zamrzavanje, zavisnosti = ADR, Stop podsjetnik, `/codex-worktree` (PR tok ili lokalni merge u baznu granu; čišćenje grane radi i poslije squash spajanja, preko `headRefOid`)
- `.claude/bez-kickstarta` (projekat sa svojim sistemom dokumenata): nema kapije ni čuvara obima, `/kickstart`, `/nova-funkcija`, `/ui-izmjena`, `/adr`, `/docs-audit`, `/napredak`, `/objavi` i `/izdanje` staju, a `/stanje` i `/kraj-sesije` rade samo uz postojeći STATUS.md
- Brzi testovi u `/kraj-sesije`, `/ui-izmjena`, `/vrati`, `/objavi` i `/codex-worktree spoji`: `scripts/test*` → AGENTS.md → `npm run test:fast`, inače pitaju
- 75 testova (74 prolazi na Windowsu, 1 preskočen; ranijih 69 prolazi na Linuxu), GitHub + auto-update

## Sljedeće
1. INHome (grana `15`): commit `a0612ea8` (napomena za `/codex-worktree`) čeka push i PR u `main`. Kad se PR #5 (kickstart 0.4.8, memory 0.4.1, guard 0.4.3) spoji u `main`, iz `CLAUDE.md` („Lični plugini") ukloniti stavke o skillovima koji sada sami staju (poseban commit)
2. `budzet` (šabloni 0.4.1, MVP 11/11): M3 je vanjski korak (Cloudflare Pages + PWA na Androidu, rok 2026-09-27), pa `/izdanje` v1.0
3. `budzet`: CI je ugašen, jer GitHub zbog naplate na nalogu ne pokreće jobove. Puni testovi idu lokalno (`pnpm test:all`, i u `/izdanje`), a koraci iz ci.yml na Linuxu prolaze. Kad se naplata sredi: Actions → CI → Enable workflow
4. Instalirati plugine na laptopu (README → Instalacija)
5. Stranica sa komandama (pinovana na claude.ai): https://claude.ai/artifact/RAWkZcHhL5WufmHyNe2NnG, izvor je PODSJETNIK.md
6. Skupljati nalaze iz stvarnog rada → male ispravke (verzija + push)
7. GitHub: u svakom repou sa PR tokom uključiti *Automatically delete head branches* (Settings → General → Pull Requests). U claude-plugins obrisati 5 starih grana spojenih PR-ova: `claude/admiring-curie-t5f1u9`, `claude/beautiful-diffie-5d20dc`, `claude/hungry-almeida-85294e`, `claude/sleepy-edison-bnoe2w`, `feat/pravilo-isti-problem`
8. Cloud sesije ne učitavaju plugine (ni korisničke, ni projektne postavke). Proba: novo cloud okruženje sa `CLAUDE_CODE_PLUGIN_DIRS`. A: putanje u `/home/user/claude-plugins/plugins/...`, bez klona. B: setup skripta klonira repo u `/opt/moji-pluginsi`. Kad prođe, upisati recept u README

## Blokeri / otvorena pitanja
- nema

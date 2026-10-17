# STATUS

**Ažurirano:** 2026-10-17 · **Talas:** D završen, ispravke po nalazima iz rada

## Radi
- `project-kickstart` 0.4.12: `/kickstart` (+ `--postojeci`, `--nadogradi`, iz drugog foldera pita za ciljni projekat), faza 4 računa rokove iz tempa, `/nova-funkcija`, `/ui-izmjena`, `/adr`, `/pomoc`, agenti `arhitekta` i `ux-recenzent`, šabloni 0.4.4 (pravilo "isti problem drugdje", VIZIJA → Gdje se koristi, rokovi, status, cilj MVP, pre-commit i `scripts/test.mjs` i na Linuxu/Macu, CI za pnpm/npm + Linux snimci)
- `project-memory` 0.4.4: SessionStart kontekst + linija napretka + pravilo „➡️ Sljedeće:“ (vodi korisnika korak po korak), upozorenje na veliku sesiju (~100k i ~150k tokena), `/vrati` (stash ili revert, uvijek povratno), `/objavi` (računar, kućna mreža ili internet), `/stanje`, `/kraj-sesije` (push uz da, pa ponudi novu sesiju sa prvom stavkom iz „Sljedeće" ili zatvaranje; ako je ostaviš otvorenu, oslobodi bravu), `/napredak [html]`, `/izdanje`, `/docs-audit`
- `project-guard` 0.5.0: tajne (i u Grep-u i komandama: secrets.json, credentials, `data/`, zasticeno.txt), kapija, brava (i za `cd X &&` / `git -C X`; čitanje preko `gh pr list/view`, `sed -n`, `git -C X log` ne uzima bravu), **sinhronizacija** (na startu čist repo se sam povuče; fetch tokom rada ide u pozadini; repo iza GitHuba sa lokalnim izmjenama → pisanje čeka pull; tuđi commit → jednom stani), limit fajlova, tokeni, čuvar obima + zamrzavanje, zavisnosti = ADR, Stop podsjetnik, `/zdravlje` (instalacija, greške i spori hookovi > 200 ms iz pravila.log), stanje po sesiji (briše se nakon 7 dana), `/codex-worktree` (PR tok ili lokalni merge u baznu granu; čišćenje grane radi i poslije squash spajanja, preko `headRefOid`)
- `.claude/bez-kickstarta` (projekat sa svojim sistemom dokumenata): nema kapije ni čuvara obima, `/kickstart`, `/nova-funkcija`, `/ui-izmjena`, `/adr`, `/docs-audit`, `/napredak`, `/objavi` i `/izdanje` staju, a `/stanje` i `/kraj-sesije` rade samo uz postojeći STATUS.md
- Brzi testovi u `/kraj-sesije`, `/ui-izmjena`, `/vrati`, `/objavi` i `/codex-worktree spoji`: `scripts/test*` → AGENTS.md → `npm run test:fast`, inače pitaju
- 88 testova (87 prolazi na Windowsu, 1 preskočen; ranijih 69 prolazi na Linuxu), uključujući test da su verzije u plugin.json i marketplace.json iste i da izmjena šablona podiže `verzija_sablona`, GitHub + auto-update

## Sljedeće
1. `budzet` (šabloni 0.4.1, MVP 11/11): M3 je vanjski korak (Cloudflare Pages + PWA na Androidu, rok 2026-09-27), pa `/izdanje` v1.0
2. `budzet`: CI je ugašen, jer GitHub zbog naplate na nalogu ne pokreće jobove. Puni testovi idu lokalno (`pnpm test:all`, i u `/izdanje`), a koraci iz ci.yml na Linuxu prolaze. Kad se naplata sredi: Actions → CI → Enable workflow
3. Instalirati plugine na laptopu (README → Instalacija), pa `/zdravlje`
4. Stranica sa komandama (pinovana na claude.ai): https://claude.ai/artifact/RAWkZcHhL5WufmHyNe2NnG, izvor je PODSJETNIK.md (osvježiti: `/zdravlje`, automatski pull)
5. Skupljati nalaze iz stvarnog rada → male ispravke (verzija + push)
6. GitHub: u svakom repou sa PR tokom uključiti *Automatically delete head branches* (Settings → General → Pull Requests). U claude-plugins obrisati 5 starih grana spojenih PR-ova: `claude/admiring-curie-t5f1u9`, `claude/beautiful-diffie-5d20dc`, `claude/hungry-almeida-85294e`, `claude/sleepy-edison-bnoe2w`, `feat/pravilo-isti-problem`
7. Cloud sesije ne učitavaju plugine (ni korisničke, ni projektne postavke). Proba: novo cloud okruženje sa `CLAUDE_CODE_PLUGIN_DIRS`. A: putanje u `/home/user/claude-plugins/plugins/...`, bez klona. B: setup skripta klonira repo u `/opt/moji-pluginsi`. Kad prođe, upisati recept u README

## Blokeri / otvorena pitanja
- nema

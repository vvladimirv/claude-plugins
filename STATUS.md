# STATUS

**Ažurirano:** 2026-10-18 · **Talas:** D završen, glavna + pomoćne sesije

## Radi
- `project-kickstart` 0.4.14: `/kickstart` (+ `--postojeci`, `--nadogradi`, iz drugog foldera pita za ciljni projekat), faza 4 računa rokove iz tempa, `/nova-funkcija`, `/ui-izmjena`, `/adr`, `/pomoc`, agenti `arhitekta` i `ux-recenzent`, šabloni 0.4.4 (pravilo "isti problem drugdje", VIZIJA → Gdje se koristi, rokovi, status, cilj MVP, pre-commit i `scripts/test.mjs` i na Linuxu/Macu, CI za pnpm/npm + Linux snimci)
- `project-memory` 0.5.0: SessionStart kontekst + linija napretka + pravilo „➡️ Sljedeće:“ (vodi korisnika korak po korak), **pomoćne sesije** (glavna sama pravi karticu, `/pomocna <zadatak>`; pomoćna na kraju `/kraj-sesije auto`: testovi, commit, rebase, PR, squash u baznu granu glavne, PushNotification, brava, arhiviranje; uz neuspjeh „Čeka tebe"), upozorenje na veliku sesiju (~100k i ~150k tokena), `/vrati` (stash ili revert, uvijek povratno), `/objavi` (računar, kućna mreža ili internet), `/stanje`, `/kraj-sesije` (push uz da, pa ponudi novu sesiju sa prvom stavkom iz „Sljedeće" i preporukom modela, ili zatvaranje; brava se oslobađa i prije arhiviranja), `/napredak [html]`, `/izdanje`, `/docs-audit`
- `project-guard` 0.6.1: **worktree unutar projekta ima svoju bravu** (aplikacija mu daje CLAUDE_PROJECT_DIR glavnog repoa), **`/grane`** (sve grane i worktreeovi sa stanjem i jednom radnjom, veza sa sesijama i njihovim modelom, `pocisti`, `nova <zadatak>` sa preporukom modela, `ceka`; nova grana sama upiše bazu, start sesije pokaže granu, zadatak i broj gotovih grana), tajne (i u Grep-u i komandama: secrets.json, credentials, `data/`, zasticeno.txt), kapija, brava (i za `cd X &&` / `git -C X`; čitanje preko `gh pr list/view`, `sed -n`, `git -C X log` ne uzima bravu), **sinhronizacija** (na startu čist repo se sam povuče; fetch tokom rada ide u pozadini; repo iza GitHuba sa lokalnim izmjenama → pisanje čeka pull; tuđi commit → jednom stani), limit fajlova, tokeni, čuvar obima + zamrzavanje, zavisnosti = ADR, Stop podsjetnik, `/zdravlje` (instalacija, greške i spori hookovi > 200 ms iz pravila.log), stanje po sesiji (briše se nakon 7 dana), `/codex-worktree` (PR tok ili lokalni merge u baznu granu; čišćenje grane radi i poslije squash spajanja, preko `headRefOid`)
- `.claude/bez-kickstarta` (projekat sa svojim sistemom dokumenata): nema kapije ni čuvara obima, `/kickstart`, `/nova-funkcija`, `/ui-izmjena`, `/adr`, `/docs-audit`, `/napredak`, `/objavi` i `/izdanje` staju, a `/stanje` i `/kraj-sesije` rade samo uz postojeći STATUS.md
- Brzi testovi u `/kraj-sesije`, `/ui-izmjena`, `/vrati`, `/objavi` i `/codex-worktree spoji`: `scripts/test*` → AGENTS.md → `npm run test:fast`, inače pitaju
- 112 testova (111 prolazi na Windowsu, 1 preskočen; ranijih 69 prolazi na Linuxu), uključujući test da su verzije u plugin.json i marketplace.json iste i da izmjena šablona podiže `verzija_sablona`, GitHub + auto-update

## Sljedeće
1. Ručna proba pomoćnih sesija (poslije `claude plugin update`): u testnom repou sa `origin` reci glavnoj samostalan zadatak → kartica → pomoćna uradi, PR se spoji, stigne obavještenje, sesija nestane iz trake; glavna povuče i osvježi STATUS. Proba i sa glavnom na posebnoj grani (spaja u nju, ne u `main`)
2. `budzet` (šabloni 0.4.1, MVP 11/11): M3 je vanjski korak (Cloudflare Pages + PWA na Androidu, rok 2026-09-27), pa `/izdanje` v1.0
3. `budzet`: CI je ugašen, jer GitHub zbog naplate na nalogu ne pokreće jobove. Puni testovi idu lokalno (`pnpm test:all`, i u `/izdanje`), a koraci iz ci.yml na Linuxu prolaze. Kad se naplata sredi: Actions → CI → Enable workflow
4. Instalirati plugine na laptopu (README → Instalacija), pa `/zdravlje`
5. Stranica sa komandama (pinovana na claude.ai): https://claude.ai/artifact/RAWkZcHhL5WufmHyNe2NnG, izvor je PODSJETNIK.md (osvježiti: `/zdravlje`, automatski pull)
6. Skupljati nalaze iz stvarnog rada → male ispravke (verzija + push)
7. `/grane pocisti` u `inhome` (36 gotovih grana, 3 foldera) i ovdje (5 grana). Grane spojenih PR-ova koje postoje samo na GitHubu `/grane` ne vidi: `claude/admiring-curie-t5f1u9`, `claude/sleepy-edison-bnoe2w`, `claude/great-franklin-ehmh5c`. GitHub: u svakom repou sa PR tokom uključiti *Automatically delete head branches* (Settings → General → Pull Requests)
8. Cloud sesije ne učitavaju plugine (ni korisničke, ni projektne postavke). Proba: novo cloud okruženje sa `CLAUDE_CODE_PLUGIN_DIRS`. A: putanje u `/home/user/claude-plugins/plugins/...`, bez klona. B: setup skripta klonira repo u `/opt/moji-pluginsi`. Kad prođe, upisati recept u README

## Blokeri / otvorena pitanja
- Projekat bez kickstarta i bez STATUS.md: `/kraj-sesije auto` tu staje (provjera markera je prva); riješiti ako se pojavi u praksi

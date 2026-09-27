# STATUS

**Ažurirano:** 2026-09-27 · **Talas:** D završen, ispravke po nalazima iz rada

## Radi
- `project-kickstart` 0.4.6: `/kickstart` (+ `--postojeci`, `--nadogradi`, iz drugog foldera pita za ciljni projekat), faza 4 računa rokove iz tempa, `/nova-funkcija`, `/ui-izmjena`, `/adr`, `/pomoc`, agenti `arhitekta` i `ux-recenzent`, šabloni 0.4.2 (rokovi, status, cilj MVP, pre-commit i `scripts/test.mjs` i na Linuxu/Macu, CI za pnpm/npm + Linux snimci)
- `project-memory` 0.3.3: SessionStart kontekst + linija napretka + pravilo „➡️ Sljedeće:“ (vodi korisnika korak po korak), `/stanje`, `/kraj-sesije` (push uz da, pa ponudi zatvaranje sesije), `/napredak [html]`, `/izdanje`, `/docs-audit`
- `project-guard` 0.4.3: tajne, kapija, brava (i za `cd X &&` / `git -C X`; čitanje preko `gh pr list/view`, `sed -n`, `git -C X log` ne uzima bravu), **sinhronizacija** (repo iza GitHuba → pisanje čeka pull; tuđi commit → jednom stani), limit fajlova, tokeni, čuvar obima + zamrzavanje, zavisnosti = ADR, Stop podsjetnik, `/codex-worktree` (PR tok ili lokalni merge u baznu granu)
- `.claude/bez-kickstarta` (projekat sa svojim sistemom dokumenata): nema kapije ni čuvara obima, `/kickstart`, `/nova-funkcija`, `/ui-izmjena`, `/adr`, `/docs-audit`, `/napredak` i `/izdanje` staju, a `/stanje` i `/kraj-sesije` rade samo uz postojeći STATUS.md
- Brzi testovi u `/kraj-sesije`, `/ui-izmjena` i `/codex-worktree spoji`: `scripts/test*` → AGENTS.md → `npm run test:fast`, inače pitaju
- 58 testova (na Linuxu zadnji put provjereno sa 50), GitHub + auto-update

## Sljedeće
1. INHome (grana `15`): commit `a0612ea8` (napomena za `/codex-worktree`) čeka push i PR u `main`. Kad se kickstart 0.4.6, memory 0.3.3 i guard 0.4.3 izdaju (push u `main`), iz `CLAUDE.md` („Lični plugini") ukloniti stavke o skillovima koji sada sami staju (poseban commit)
2. `budzet` (šabloni 0.4.1, MVP 11/11): M3 je vanjski korak (Cloudflare Pages + PWA na Androidu, rok 2026-09-27), pa `/izdanje` v1.0
3. `budzet`: CI je ugašen, jer GitHub zbog naplate na nalogu ne pokreće jobove. Puni testovi idu lokalno (`pnpm test:all`, i u `/izdanje`), a koraci iz ci.yml na Linuxu prolaze. Kad se naplata sredi: Actions → CI → Enable workflow
4. Instalirati plugine na laptopu (README → Instalacija)
5. Stranica sa komandama (pinovana na claude.ai): https://claude.ai/artifact/RAWkZcHhL5WufmHyNe2NnG, izvor je PODSJETNIK.md
6. Skupljati nalaze iz stvarnog rada → male ispravke (verzija + push)

## Blokeri / otvorena pitanja
- nema

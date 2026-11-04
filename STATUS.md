# STATUS

**Ažurirano:** 2026-11-04 · **Talas:** D završen, glavna + pomoćne sesije

## Radi
- `project-kickstart` 0.4.14: `/kickstart` (`--postojeci`, `--nadogradi`), `/nova-funkcija`, `/ui-izmjena`, `/adr`, `/pomoc`, agenti `arhitekta` i `ux-recenzent`, šabloni 0.4.4
- `project-memory` 0.5.3: SessionStart kontekst (STATUS po sekcijama: „Sljedeće“ i „Blokeri“ uvijek cijeli, dugačak „Radi“ se skrati), linija napretka, pravilo „➡️ Sljedeće:“, pomoćne sesije (`/pomocna`, `/kraj-sesije auto`), upozorenje na veliku sesiju, `/stanje`, `/kraj-sesije`, `/vrati`, `/objavi`, `/napredak`, `/izdanje`, `/docs-audit`
- `project-guard` 0.6.2: tajne, kapija, brava (i za worktree u projektu), sinhronizacija sa GitHubom, čuvar obima, limiti fajlova i tokena, `/grane`, `/zdravlje`, `/codex-worktree`; cloud sesija sama povuče pluginove sa GitHuba
- `.claude/bez-kickstarta`: projekat sa svojim dokumentima; kickstart komande staju, `/stanje` i `/kraj-sesije` rade uz postojeći STATUS.md
- Brzi testovi u `/kraj-sesije`, `/ui-izmjena`, `/vrati`, `/objavi` i `/codex-worktree spoji`: `scripts/test*` → AGENTS.md → `npm run test:fast`, inače pitaju
- Testovi prolaze na Linuxu (verzije plugin.json = marketplace.json, hash šablona, GitHub + auto-update); na Windowsu jedan preskočen

## Sljedeće
1. Ručna proba pomoćne sesije sa glavnom na posebnoj grani (`C:/dev/proba-pomocne`): spoj mora ići u tu granu, ne u `main`
2. `budzet`: M3 (Cloudflare Pages + PWA na Androidu), pa `/izdanje` v1.0; CI uključiti kad se sredi naplata na GitHubu (Actions → CI → Enable workflow)
3. Instalirati plugine na laptopu (README → Instalacija), pa `/zdravlje`
4. Cloud sesije: provjeriti SessionStart kontekst za pravi projekat (npr. `budzet`); setup skriptu `# v2` → `# v3` uz `CLAUDE_CODE_PLUGIN_DIR_WATCH=1`, pa provjeriti poruku „Pluginovi su osvježeni“
5. `/grane pocisti` u `inhome` i ovdje; grane spojenih PR-ova koje su samo na GitHubu (`claude/admiring-curie-t5f1u9`, `claude/sleepy-edison-bnoe2w`, `claude/great-franklin-ehmh5c`) obrisati ručno i uključiti *Automatically delete head branches*; stranicu komandi na claude.ai osvježiti iz PODSJETNIK.md

## Blokeri / otvorena pitanja
- Projekat bez kickstarta i bez STATUS.md: `/kraj-sesije auto` tu staje (provjera markera je prva); riješiti ako se pojavi u praksi

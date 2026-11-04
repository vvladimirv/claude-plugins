# STATUS

**Ažurirano:** 2026-11-04 · **Talas:** D završen, pregled od 2026-11-04 (stavke 4–7 riješene)

## Radi
- `project-kickstart` 0.5.0: `/kickstart` (+ `--lagano` za male lične aplikacije, `--postojeci`, `--nadogradi` sa prelaskom lagano → puno), `/nova-funkcija`, `/ui-izmjena`, `/adr`, `/pomoc`, agenti `arhitekta` i `ux-recenzent`, šabloni 0.4.4
- `project-memory` 0.5.4: SessionStart kontekst i napredak, „➡️ Sljedeće:“, pomoćne sesije (`/pomocna`, `/kraj-sesije auto`), `/stanje`, `/kraj-sesije`, `/vrati`, `/objavi`, `/napredak`, `/izdanje`, `/docs-audit`
- `project-guard` 0.6.3: tajne, kapija, brava (i po worktreeu), sinhronizacija, čuvar obima, zavisnosti = ADR, limit fajlova, `/grane`, `/zdravlje`, `/codex-worktree`, samoosvježavanje u cloudu
- Cloud sesija: `/kraj-sesije`, `/pomocna` i `/grane` koriste i cloud imena alata (arhiviranje radi, model druge sesije ne)
- Lagani projekat: hookovi bez BLUEPRINT/INVENTAR/ARHITEKTURA/ADR šute, a čuvar obima i kapija rade
- 135 testova prolazi na Linuxu; test pazi da kopije funkcija guard → memory ne zaostanu

## Sljedeće
1. Pushati ovu granu i spojiti PR (stavke 4–7 iz pregleda)
2. Probati `/kraj-sesije` u cloud sesiji sa telefona: kartica bez `cwd` i arhiviranje preko `get_session` id-a
3. Probati `/kickstart --lagano` na sljedećem malom projektu
4. `budzet`: M3 (Cloudflare Pages + PWA na Androidu), pa `/izdanje` v1.0
5. `/grane pocisti` u `inhome` i ovdje; u GitHub repoima uključiti *Automatically delete head branches*

## Blokeri / otvorena pitanja
- `dependencies` u plugin.json (memory → guard): `claude plugin validate .` ga ne provjerava, a bez guarda gasi cijeli memory. Nije dodano; odlučiti da li je tvrda zavisnost bolja od rada „bez /grane smanjeno“
- Worktreeovi: odluka (a), ostaje kako je. `/pomocna` već koristi nativni worktree, a `/codex-worktree` ostaje jer nativni ne radi za Codex
- Cloud: klon `/opt/moji-pluginsi` u ovom okruženju bio je na guardu 0.6.1; provjeriti samoosvježavanje (setup skripta `# v3`, `CLAUDE_CODE_PLUGIN_DIR_WATCH=1`)
- Projekat bez kickstarta i bez STATUS.md: `/kraj-sesije auto` tu staje; riješiti ako se pojavi u praksi

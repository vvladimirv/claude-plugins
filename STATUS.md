# STATUS

**Ažurirano:** 2026-09-25 · **Talas:** D (napredak i izdanje)

## Radi
- `project-kickstart` 0.4.2: `/kickstart` (+ `--postojeci`, `--nadogradi`), faza 4 računa rokove iz tempa, `/nova-funkcija`, `/ui-izmjena`, `/adr`, `/pomoc`, agenti `arhitekta` i `ux-recenzent`, šabloni 0.4.1 (rokovi, status, cilj MVP, pre-commit, CI)
- `project-memory` 0.3.1: SessionStart kontekst + linija napretka, `/stanje`, `/kraj-sesije`, `/napredak [html]`, `/izdanje`, `/docs-audit`
- `project-guard` 0.3.1: tajne, kapija, brava, limit fajlova, tokeni, čuvar obima + zamrzavanje poslije izdanja, zavisnosti = ADR, Stop podsjetnik, izlazi iz brave, `/codex-worktree` spaja u baznu granu (ne u `main`)
- Brzi testovi u `/kraj-sesije`, `/ui-izmjena` i `/codex-worktree spoji`: `scripts/test*` → AGENTS.md → `npm run test:fast`, inače pitaju
- 44 testa, GitHub + auto-update

## Sljedeće
1. INHome: kad stigne guard 0.3.1, iz `CLAUDE.md` ukloniti napomenu o ručnom spajanju za `/codex-worktree`
2. U `C:\dev\budzet`: `/kickstart --nadogradi` (0.1.0 → 0.4.1), pa `/izdanje` (MVP je 11/11)
3. Instalirati plugine na laptopu (README → Instalacija)
4. Skupljati nalaze iz stvarnog rada → male ispravke (verzija + push)

## Blokeri / otvorena pitanja
- nema

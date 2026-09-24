# STATUS

**Ažurirano:** 2026-09-24 · **Talas:** C (dorada), svi talasi gotovi

## Radi
- `project-kickstart` 0.3.1: `/kickstart` (+ `--postojeci`, `--nadogradi`, nova tema iz drugog projekta), `/nova-funkcija`, `/ui-izmjena`, `/adr`, `/pomoc`, agenti `arhitekta` i `ux-recenzent`, šabloni 0.3.0 (pre-commit, CI)
- `project-memory` 0.2.1: SessionStart kontekst, `/stanje`, `/kraj-sesije`, `/docs-audit`
- `project-guard` 0.2.1: tajne, kapija, brava, limit fajlova, tokeni, čuvar obima, zavisnosti = ADR, Stop podsjetnik, `/pravila-pauza`, `/preuzmi-lock`, `/novi-projekat`, `/ideja`, `/codex-worktree` (spaja u baznu granu, ne u `main`), `/pravilo-u-hook`
- Brzi testovi u `/kraj-sesije`, `/ui-izmjena` i `/codex-worktree spoji`: `scripts/test*` → AGENTS.md → `npm run test:fast`, inače pitaju
- 37 testova (hookovi, pre-commit kroz pravi `git commit`, ista uputa u tri skilla), GitHub + auto-update

## Sljedeće
1. INHome: kad stigne guard 0.2.1, iz `CLAUDE.md` ukloniti napomenu o ručnom spajanju za `/codex-worktree`
2. `/kickstart --nadogradi` u `C:\dev\budzet` (0.1.0 → 0.3.0)
3. Instalirati plugine na laptopu (README → Instalacija)
4. Skupljati nalaze iz stvarnog rada → male ispravke (verzija + push)

## Blokeri / otvorena pitanja
- nema

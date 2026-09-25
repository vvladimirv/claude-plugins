# STATUS

**Ažurirano:** 2026-09-25 · **Talas:** D završen, ispravke po nalazima iz rada

## Radi
- `project-kickstart` 0.4.2: `/kickstart` (+ `--postojeci`, `--nadogradi`, iz drugog foldera pita za ciljni projekat), faza 4 računa rokove iz tempa, `/nova-funkcija`, `/ui-izmjena`, `/adr`, `/pomoc`, agenti `arhitekta` i `ux-recenzent`, šabloni 0.4.2 (rokovi, status, cilj MVP, pre-commit i `scripts/test.mjs` i na Linuxu/Macu, CI za pnpm/npm + Linux snimci)
- `project-memory` 0.3.0: SessionStart kontekst + linija napretka, `/stanje`, `/kraj-sesije`, `/napredak [html]`, `/izdanje`, `/docs-audit`
- `project-guard` 0.3.0: tajne, kapija, brava, limit fajlova, tokeni, čuvar obima + zamrzavanje poslije izdanja, zavisnosti = ADR, Stop podsjetnik, izlazi iz brave
- 44 testa (prolaze i na Linuxu), GitHub + auto-update

## Sljedeće
1. `budzet` (šabloni 0.4.1, MVP 11/11): M3 je vanjski korak (Cloudflare Pages + PWA na Androidu, rok 2026-09-27), pa `/izdanje` v1.0
2. `budzet`: CI je ugašen, jer GitHub zbog naplate na nalogu ne pokreće jobove. Puni testovi idu lokalno (`pnpm test:all`, i u `/izdanje`), a koraci iz ci.yml na Linuxu prolaze. Kad se naplata sredi: Actions → CI → Enable workflow
3. Instalirati plugine na laptopu (README → Instalacija)
4. Skupljati nalaze iz stvarnog rada → male ispravke (verzija + push)

## Blokeri / otvorena pitanja
- nema

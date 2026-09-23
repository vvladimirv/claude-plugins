# Podsjetnik: rad sa projektima

Oznake: ✅ radi sada · 🔜 dolazi u sljedećem talasu

## Tok rada
| Kad | Automatski | Ti radiš |
|---|---|---|
| **Nov projekat** | 🔜 kapija te dočeka i predloži `/kickstart` | napravi folder u `C:\dev\<ime>`, otvori ga u Claude Codeu, pokreni ✅ `/kickstart <tema>` i odgovori na intervju |
| **Postojeći projekat bez temelja** | — | ✅ `/kickstart --postojeci` (pravi samo dokumente koji fale, ništa ne prepisuje) |
| **Start sesije** | ✅ STATUS.md + zadnjih 10 commitova u kontekstu | ništa |
| **Tokom rada** | 🔜 brava, čuvar obima, limit fajlova, zaštita tajni | 🔜 `/nova-funkcija`, `/ui-izmjena`, `/adr` |
| **Testovi** | ✅ `scripts/test` ispisuje samo sažetak | E2E i screenshot testovi idu u CI |
| **Paralelni rad** | 🔜 brava blokira drugu sesiju u istom folderu | druga sesija ide u **worktree** (desktop app: opcija worktree; terminal: `claude --worktree`) |
| **Kraj rada** | 🔜 podsjetnik na necommitovan rad | ✅ `/kraj-sesije` |
| **Povremeno** | — | ✅ `/stanje` · 🔜 `/docs-audit`, `/kickstart --nadogradi` |

## Gdje je šta u projektu
| Fajl | Samo za |
|---|---|
| `AGENTS.md` | pravila (za Claude i Codex) |
| `CLAUDE.md` | uvozi AGENTS.md + ono što je samo za Claude |
| `STATUS.md` | trenutno stanje (≤ 30 linija, prepisuje se) |
| `git log` | historija (ne piše se u .md) |
| `docs/VIZIJA.md` | problem, **Obim**, **Van obima** |
| `docs/POJMOVI.md` | rječnik pojmova domene |
| `docs/ARHITEKTURA.md` | moduli, folderi, slojevi |
| `docs/INVENTAR-FUNKCIJA.md` | F-lista = ugovor (redizajn ne smije izgubiti funkciju) |
| `docs/adr/` | odluke sa razlogom |

## Koji model za šta
| Posao | Model | Effort |
|---|---|---|
| Nov projekat, arhitektura, teški bug | Opus | visok |
| Svakodnevno kodiranje po planu | Sonnet | srednji |
| STATUS, commit poruke, sitnice | Haiku | nizak |
Model i effort glavnog chata biraš ti. Skillovi i agenti iz plugina imaju svoj model upisan.

## 5 zlatnih pravila
1. Projekti u `C:\dev\`, nikad u OneDriveu. Sinhronizacija ide preko gita.
2. Commit poslije svakog zaokruženog koraka. Commit je save point.
3. Pravila su u AGENTS.md, stanje u STATUS.md, historija u git logu.
4. Jedan projekat = jedna tema. Nova tema dobija nov projekat.
5. Jedan agent = jedan folder (worktree) = jedna grana.

## Plugini
Repo: `C:\dev\claude-plugins` · uputstvo za instalaciju i ažuriranje: `README.md` u tom repou.

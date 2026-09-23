# Podsjetnik: rad sa projektima

Oznake: ✅ radi sada · 🔜 dolazi u talasu C

## Tok rada
| Kad | Automatski | Ti radiš |
|---|---|---|
| **Nov projekat** | ✅ kapija: u novom folderu u `C:\dev\` kod je blokiran dok ne uradiš kickstart | napravi folder u `C:\dev\<ime>`, otvori ga, pokreni `/kickstart <tema>` i odgovori na intervju |
| **Postojeći projekat bez temelja** | ✅ jednom predloži kickstart, ali ne blokira | `/kickstart --postojeci` (pravi samo dokumente koji fale) |
| **Start sesije** | ✅ STATUS.md, zadnjih 10 commitova, obim projekta, upozorenja (OneDrive, brava) | ništa |
| **Tokom rada** | ✅ zaštita tajni · ✅ limit fajla (300 upozori, 500 blokira rast) · ✅ boje samo iz tokena · ✅ čuvar obima | `/nova-funkcija <ime>`, `/ui-izmjena <opis>` · 🔜 `/adr` |
| **Zahtjev van obima** | ✅ Claude pita za vezu i nudi 4 izbora | povezano / proširenje obima / `/novi-projekat` / `/ideja` · izuzetak: "svjesno, nastavi" |
| **Testovi** | ✅ `scripts/test` ispisuje samo sažetak | E2E i screenshot testovi idu u CI |
| **Paralelni rad** | ✅ brava: u istom folderu piše samo jedna sesija (istekne nakon 20 min neaktivnosti) | druga sesija ide u **worktree**: `git worktree add ../<projekat>-<zadatak> -b <grana>` · `/preuzmi-lock` ako je prva sesija zatvorena |
| **Kraj rada** | ✅ podsjetnik kad ima ≥ 10 necommitovanih fajlova ili su stariji od 2 h | `/kraj-sesije` |
| **Povremeno** | — | `/stanje` · 🔜 `/docs-audit`, `/kickstart --nadogradi` |
| **Hook smeta ili ima grešku** | — | `/pravila-pauza [minuta]` (tajne ostaju zaštićene) · `/pravila-pauza stop` · greške: `~/.claude/pravila.log` |

## Gdje je šta u projektu
| Fajl | Samo za |
|---|---|
| `AGENTS.md` | pravila (za Claude i Codex) |
| `CLAUDE.md` | uvozi AGENTS.md + ono što je samo za Claude |
| `STATUS.md` | trenutno stanje (≤ 30 linija, prepisuje se) |
| `git log` | historija (ne piše se u .md) |
| `docs/VIZIJA.md` | problem, **Obim**, **Van obima** (čita ih čuvar obima) |
| `docs/POJMOVI.md` | rječnik pojmova domene |
| `docs/ARHITEKTURA.md` | moduli, folderi, slojevi |
| `docs/INVENTAR-FUNKCIJA.md` | F-lista = ugovor (redizajn ne smije izgubiti funkciju) |
| `docs/adr/` | odluke sa razlogom |
| `.claude/granice.json` | (opciono) drugi limiti fajla: `{"upozorenje":300,"maks":500,"iskljuci":["legacy/**"]}` |
| `.claude/zasticeno.txt` | (opciono) dodatni fajlovi koje agent ne smije dirati, jedan glob po liniji |
| `.claude/bez-kickstarta` | (opciono) prazan fajl: folder svjesno bez kickstarta |

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
Repo: `C:\dev\claude-plugins` (GitHub: vvladimirv/claude-plugins) · instalacija i ažuriranje: `README.md` u tom repou.

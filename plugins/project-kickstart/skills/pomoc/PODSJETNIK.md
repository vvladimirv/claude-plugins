# Podsjetnik: rad sa projektima

Sve navedeno radi (talasi A–D).

## Tok rada
| Kad | Automatski | Ti radiš |
|---|---|---|
| **Nov projekat** | ✅ kapija: u novom folderu u `C:\dev\` kod je blokiran dok ne uradiš kickstart | napravi folder u `C:\dev\<ime>`, otvori ga, pokreni `/kickstart <tema>` i odgovori na intervju |
| **Postojeći projekat bez temelja** | ✅ jednom predloži kickstart, ali ne blokira | `/kickstart --postojeci` (pravi samo dokumente koji fale) |
| **Start sesije** | ✅ STATUS.md, zadnjih 10 commitova, obim projekta, upozorenja (OneDrive, brava) | ništa |
| **Tokom rada** | ✅ zaštita tajni · ✅ limit fajla (300 upozori, 500 blokira rast) · ✅ boje samo iz tokena · ✅ čuvar obima | `/nova-funkcija <ime>`, `/ui-izmjena <opis>` (uz agenta ux-recenzent), `/adr <odluka>` |
| **Zahtjev van obima** | ✅ Claude pita za vezu i nudi 4 izbora | povezano / proširenje obima / `/novi-projekat` / `/ideja` · izuzetak: "svjesno, nastavi" |
| **Nova biblioteka** | ✅ podsjetnik ako nijedan ADR ne spominje novu zavisnost | `/adr` (zašto baš ona, alternative) |
| **Commit** | ✅ pre-commit (u projektima od kickstarta 0.3.0): brava, tajne, veličina fajla, brzi testovi. Važi i za Codex i za tebe iz terminala | nikad `--no-verify` |
| **Testovi** | ✅ `scripts/test` ispisuje samo sažetak · CI na GitHubu pokreće pune, E2E i screenshot testove | — |
| **Paralelni rad** | ✅ brava: u istom folderu piše samo jedna sesija (istekne nakon 20 min neaktivnosti) | druga sesija ili Codex ide u **worktree**: `/codex-worktree <zadatak>`, pa kad je gotovo `/codex-worktree spoji <zadatak>` · `/preuzmi-lock` ako je prva sesija zatvorena |
| **Kraj rada** | ✅ podsjetnik kad ima ≥ 10 necommitovanih fajlova ili su stariji od 2 h | `/kraj-sesije` (kad milestone završi: `Status` → `gotovo YYYY-MM-DD` u BLUEPRINT.md) |
| **Napredak** | ✅ na startu sesije linija: milestone, % funkcija, kašnjenje, prognoza MVP-a | `/napredak` (terminal) · `/napredak html` (vizuelni pregled) · kad se kasni: smanji obim (`odloženo (v2)`), novi rok ili nastavi |
| **MVP gotov** | ✅ Claude predloži izdanje umjesto novih funkcija | `/izdanje`: CHANGELOG, tag v1.0, obim se zamrzava (održavanje). Nova verzija samo kroz plan sa rokovima |
| **Povremeno** | — | `/stanje` · `/docs-audit` (red u dokumentima) · `/kickstart --nadogradi` (novi šabloni u starom projektu) · `/pravilo-u-hook` (pravilo koje se zaboravlja postaje provjera) |
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

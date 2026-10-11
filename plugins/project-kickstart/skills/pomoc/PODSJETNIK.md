# Podsjetnik: rad sa projektima

Sve navedeno radi (talasi A–D).

## Komande koje kucaš
Većinu vremena pričaš normalno. Na kraju odgovora Claude napiše `➡️ Sljedeće:` i tu je tvoj sljedeći korak.

| Kad | Kucaš |
|---|---|
| Nov projekat (jednom) | napravi folder `C:\dev\<ime>`, otvori ga, pa `/kickstart <o čemu je aplikacija>` |
| Početak svakog rada | otvori folder projekta, pa `nastavi` ili `šta je sljedeće?` |
| Nova mogućnost aplikacije | napiši šta hoćeš (ili `/nova-funkcija <ime>`) |
| Promjena izgleda | `/ui-izmjena <šta promijeniti>` |
| Vidi koliko ste odmakli | `/napredak html` |
| Ideja za nešto drugo | `/ideja <opis>` |
| Nešto se pokvarilo, a radilo je | `/vrati` (predomislio si se: `/vrati poništi`) |
| Ne razumiješ upozorenje | `objasni mi ovo upozorenje i riješi ga` |
| Izgubio si se | `ne znam šta sad, vodi me` ili `/pomoc` |
| Aplikacija treba da radi bez Claudea | `/objavi` (na ovom računaru, na kućnoj mreži ili na internetu) |
| Prva verzija gotova | `/izdanje` (Claude ga sam predloži) |
| Poruka „Razgovor je velik" | kad završi korak: `/kraj-sesije`, pa nova sesija |
| **Kraj svakog rada** | `/kraj-sesije` |

## Tok rada
| Kad | Automatski | Ti radiš |
|---|---|---|
| **Nov projekat** | ✅ kapija: u novom folderu u `C:\dev\` kod je blokiran dok ne uradiš kickstart | napravi folder u `C:\dev\<ime>`, otvori ga, pokreni `/kickstart <tema>` i odgovori na intervju |
| **Postojeći projekat bez temelja** | ✅ jednom predloži kickstart, ali ne blokira | `/kickstart --postojeci` (pravi samo dokumente koji fale) · projekat sa svojim sistemom dokumenata: `.claude/bez-kickstarta` (vidi ispod) |
| **Start sesije** | ✅ STATUS.md, zadnjih 10 commitova, obim projekta, upozorenja (OneDrive, brava, repo iza GitHuba) | otvori sesiju **u folderu projekta**, ne u drugom folderu |
| **Repo se promijenio ispod sesije** | ✅ repo iza GitHuba: pisanje čeka `git pull` · druga sesija commitovala: prva izmjena staje jednom, uz listu commitova | `git pull --ff-only`, pročitaj šta je novo, pa nastavi |
| **Tokom rada** | ✅ zaštita tajni · ✅ limit fajla (300 upozori, 500 blokira rast) · ✅ boje samo iz tokena · ✅ čuvar obima | `/nova-funkcija <ime>`, `/ui-izmjena <opis>` (uz agenta ux-recenzent), `/adr <odluka>` |
| **Zahtjev van obima** | ✅ Claude pita za vezu i nudi 4 izbora | povezano / proširenje obima / `/novi-projekat` / `/ideja` · izuzetak: "svjesno, nastavi" |
| **Nova biblioteka** | ✅ podsjetnik ako nijedan ADR ne spominje novu zavisnost | `/adr` (zašto baš ona, alternative) |
| **Commit** | ✅ pre-commit (u projektima od kickstarta 0.3.0): brava, tajne, veličina fajla, brzi testovi. Važi i za Codex i za tebe iz terminala | nikad `--no-verify` |
| **Testovi** | ✅ `scripts/test` ispisuje samo sažetak · CI na GitHubu pokreće pune, E2E i screenshot testove · `/kraj-sesije`, `/ui-izmjena` i `/codex-worktree spoji` pokreću prvo što nađu: `scripts/test` → „Brzi testovi" iz AGENTS.md → `npm run test:fast` (inače pitaju) | — |
| **Paralelni rad** | ✅ brava: u istom folderu piše samo jedna sesija (oslobađa se na kraju sesije, a istekne i nakon 20 min bez pisanja) | druga sesija ili Codex ide u **worktree**: `/codex-worktree <zadatak>`. Kad je gotovo, `/codex-worktree spoji <zadatak>` napravi **PR** (pregledaš diff i klikneš Merge na GitHubu), a ponovljeni `spoji` počisti worktree i granu (i kad je PR spojen squashom). Bez GitHuba se spaja lokalno. · `/preuzmi-lock` ako je prva sesija zatvorena |
| **Nešto se pokvarilo** | — | `/vrati`: odbaci nesnimljene izmjene ili poništi zadnje commitove. Ništa se ne briše zauvijek, a `/vrati poništi` vraća nazad |
| **Kraj rada** | ✅ podsjetnik kad ima ≥ 10 necommitovanih fajlova ili su stariji od 2 h · ✅ upozorenje kad razgovor pređe ~100k i ~150k tokena (svaka poruka je tada skuplja) · sesija vezana za PR se sama arhivira kad se PR spoji | `/kraj-sesije`: testovi, STATUS, commit, push (uz tvoje da), pa ponudi **novu sesiju sa prvom stavkom iz „Sljedeće"** (u desktop aplikaciji kartica, jedan klik je otvara, a ova se arhivira; u terminalu gotov prompt za kopiranje); na „Ne" ponudi **zatvaranje sesije** kad je sve commitovano; ako je ostaviš otvorenu, `/kraj-sesije` oslobodi bravu (kad milestone završi: `Status` → `gotovo YYYY-MM-DD` u BLUEPRINT.md) · jednom po repou: uključi *Automatically delete head branches* (GitHub → Settings → General → Pull Requests), pa GitHub briše granu čim se PR spoji |
| **Napredak** | ✅ na startu sesije linija: milestone, % funkcija, kašnjenje, prognoza MVP-a | `/napredak` (terminal) · `/napredak html` (vizuelni pregled) · kad se kasni: smanji obim (`odloženo (v2)`), novi rok ili nastavi |
| **Aplikacija za korištenje** | — | `/objavi`: samo na ovom računaru (`Pokreni.cmd`, dvoklik), na kućnoj mreži (i telefon u kući) ili na internetu (hosting, instalacija na telefon). Kickstart zapisuje izbor u VIZIJA.md → `Gdje se koristi` |
| **MVP gotov** | ✅ Claude predloži izdanje umjesto novih funkcija (i prvo `/objavi`, ako README nema `Kako se koristi`) | `/izdanje`: CHANGELOG, tag v1.0, obim se zamrzava (održavanje). Nova verzija samo kroz plan sa rokovima |
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
| `.claude/bez-kickstarta` | (opciono) projekat ima svoj sistem dokumenata, a pravila rada su u njegovom AGENTS.md/CLAUDE.md. Nema kapije ni čuvara obima. `/kickstart`, `/nova-funkcija`, `/ui-izmjena`, `/adr`, `/docs-audit`, `/napredak`, `/objavi` i `/izdanje` tu staju i ništa ne prave, a `/stanje` i `/kraj-sesije` rade samo ako `STATUS.md` postoji. Tajne, limit fajla, brava i sinhronizacija rade i dalje |

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

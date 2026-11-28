# Podsjetnik: rad sa projektima

Sve navedeno radi.

## Komande koje kucaš
Većinu vremena pričaš normalno. Na kraju odgovora Claude napiše `➡️ Sljedeće:` i tu je tvoj sljedeći korak.

| Kad | Kucaš | Ulaz → izlaz (fajl) |
|---|---|---|
| Ideja za aplikaciju: ima li kupaca i isplati li se (prije kickstarta) | `/trziste <ideja>`, pa `/isplativost` | ideja → `docs/TRZISTE.md` |
| Ideja iz Oblaka ideja sa odlukom build | u Oblaku `npm run predaj -- I-NNN <folder>`, pa u tom folderu `/kickstart` (čita analize i pita samo za praznine) | predaja iz Oblaka → temeljni dokumenti |
| Nov projekat (jednom) | napravi folder `C:\dev\<ime>`, otvori ga, pa `/kickstart <o čemu je aplikacija>` | intervju → `AGENTS.md`, `STATUS.md`, `docs/*` |
| Početak svakog rada | otvori folder projekta, pa `nastavi` ili `šta je sljedeće?` | `STATUS.md` → rad |
| Nova mogućnost aplikacije | napiši šta hoćeš (ili `/nova-funkcija <ime>`) | `docs/VIZIJA.md` → F-broj u `docs/INVENTAR-FUNKCIJA.md`, test, kod |
| Promjena izgleda | `/ui-izmjena <šta promijeniti>` | `docs/DIZAJN-SISTEM.md`, `docs/EKRANI.md` → kod, snimci |
| Šta ne valja u izgledu (snimci svih ekrana, pristupačnost) | `/provjera-izgleda` · prijedlog novog izgleda u varijantama: `/mockup-izgleda` | aplikacija → izvještaj u `docs/provjere/` · mockup HTML van aplikacije |
| Igra: da li su brojke u balansu (bot + zapisi testera) | `/balans [bot\|testeri\|sve] [tema]` | bot alat, zapisi testera → `docs/bot-*.txt` |
| Prije izdanja ili poslije izmjene obračuna: greške koje obični testovi ne vide | `/dubinska-provjera` | kod i testovi → izvještaj u `docs/provjere/` |
| Vidi koliko ste odmakli | `/napredak html` | `docs/BLUEPRINT.md` → pregled |
| Samostalan zadatak usput (npr. popravka sa strane) | ništa: Claude sam napravi karticu **pomoćne sesije**, ti klikneš · ručno: `/pomocna <zadatak>` | zadatak → PR u baznu granu |
| Ideja za nešto drugo | `/ideja <opis>` | opis → repo `C:\dev\ideje` |
| Nešto se pokvarilo, a radilo je | `/vrati` (predomislio si se: `/vrati poništi`) | git → zadnje stanje koje je radilo |
| Ne razumiješ upozorenje | `objasni mi ovo upozorenje i riješi ga` | — |
| Izgubio si se | `ne znam šta sad, vodi me` ili `/pomoc` | ovaj podsjetnik |
| Ne znaš koja grana je gotova, koja čeka koju, gdje je ostao rad | `/grane` (gotove počisti `/grane pocisti`) | git grane → pregled |
| Novi zadatak paralelno sa ovim | `/grane nova <zadatak>` (kartica nove sesije sa preporukom modela) | zadatak → nova grana i kartica |
| Plugini kao da ne rade, ili nov računar | `/zdravlje` | instalacija, `pravila.log`, lični sloj → izvještaj |
| Aplikacija treba da radi bez Claudea | `/objavi` (na ovom računaru, na kućnoj mreži ili na internetu) | `docs/VIZIJA.md` → `README.md` (`Kako se koristi`) |
| Prva verzija gotova | `/izdanje` (Claude ga sam predloži) | → `CHANGELOG.md`, git tag |
| Poruka „Razgovor je velik" | kad završi korak: `/kraj-sesije`, pa nova sesija | — |
| **Kraj svakog rada** | `/kraj-sesije` | rad → commitovi, `STATUS.md`, push · opšta lekcija → `claude-licno/znanje/` |

## Paralelni rad: kada koji
| Hoćeš | Komanda | Gdje radi | Kako se vraća |
|---|---|---|---|
| Sporedan zadatak koji Claude završi bez tebe | `/pomocna <zadatak>` (Claude sam nudi karticu) | nativni worktree aplikacije | sama testira i spoji PR u granu glavne sesije |
| Nov zadatak koji ćeš voditi u drugoj sesiji | `/grane nova <zadatak>` | nova grana i sesija (kartica sa modelom) | ti, kroz `/kraj-sesije` u toj sesiji |
| Drugi alat bez nativnog worktreea (Codex, terminal) | `/codex-worktree <zadatak>` | worktree `../<projekat>-<zadatak>` | `/codex-worktree spoji <zadatak>` → PR |

## Tok rada
| Kad | Automatski | Ti radiš |
|---|---|---|
| **Nov projekat** | ✅ kapija: u novom folderu u `C:\dev\` kod je blokiran dok ne uradiš kickstart | napravi folder u `C:\dev\<ime>`, otvori ga, pokreni `/kickstart <tema>` i odgovori na intervju · mala lična aplikacija: **lagani start** (kickstart sam pita, ili `--lagano`): samo VIZIJA, STATUS, AGENTS i CLAUDE, bez plana sa rokovima; `/napredak` tu ne radi, a `/izdanje`, `/nova-funkcija` i `/ui-izmjena` rade smanjeno · kad poraste: `/kickstart --nadogradi` → prelazak na puni |
| **Postojeći projekat bez temelja** | ✅ jednom predloži kickstart, ali ne blokira | `/kickstart --postojeci` (pravi samo dokumente koji fale) · projekat sa svojim sistemom dokumenata: `.claude/bez-kickstarta` (vidi ispod) |
| **Start sesije** | ✅ STATUS.md, zadnjih 10 commitova, obim projekta, upozorenja (OneDrive, brava, repo iza GitHuba, grana sa commitovima kojih nema na GitHubu) · guard sam mijenja dvije stvari: čist repo iza GitHuba povuče (`git merge --ff-only`) i, ako projekat ima `.githooks/`, a `core.hooksPath` nije postavljen, upiše `git config core.hooksPath .githooks` · ✅ lični sloj: najviše jednom u 10 min povuče čiste `claude-licno` i `claude-plugins` i javi kad su pluginovi u izvoru noviji od instaliranih (tada `node scripts/setup.js --apply`) | otvori sesiju **u folderu projekta**, ne u drugom folderu |
| **Repo se promijenio ispod sesije** | ✅ na startu sesije čist repo se sam povuče sa GitHuba · cloud sesija: i pluginovi se sami povuku sa GitHuba i javi se nova verzija · repo iza GitHuba sa lokalnim izmjenama: pisanje čeka `git pull` · druga sesija commitovala: prva izmjena staje jednom, uz listu commitova | `git pull --ff-only`, pročitaj šta je novo, pa nastavi |
| **Tokom rada** | ✅ zaštita tajni (čitanje, pretraga i komande) · ✅ limit fajla (300 upozori, 500 blokira rast; i Godot `.gd`) · ✅ boje samo iz tokena (i `Color(...)` u GDScriptu van `tokens.gd`) · ✅ čuvar obima | `/nova-funkcija <ime>`, `/ui-izmjena <opis>` (uz agenta ux-recenzent), `/adr <odluka>` |
| **Zahtjev van obima** | ✅ Claude pita za vezu i nudi 4 izbora | povezano / proširenje obima / `/novi-projekat` / `/ideja` · izuzetak: "svjesno, nastavi" |
| **Nova biblioteka** | ✅ podsjetnik ako nijedan ADR ne spominje novu zavisnost (i nov Godot dodatak u `addons/`) | `/adr` (zašto baš ona, alternative) |
| **Godot izvoz** | ✅ pri izmjeni `export_presets.cfg`, test foldera ili podataka (`maps/*.txt`; json je resurs pa se ne traži): javlja test folder koji `exclude_filter` ne pokriva i podatke koji nisu resursi a fale u `include_filter` | — |
| **Commit** | ✅ pre-commit (u projektima od kickstarta 0.3.0): brava, tajne, veličina fajla, brzi testovi. Važi i za Codex i za tebe iz terminala | nikad `--no-verify` |
| **Testovi** | ✅ `scripts/test` ispisuje samo sažetak · CI na GitHubu pokreće pune, E2E i screenshot testove · `/kraj-sesije`, `/ui-izmjena` i `/codex-worktree spoji` pokreću prvo što nađu: `scripts/test` → „Brzi testovi" iz AGENTS.md → `npm run test:fast` (inače pitaju) | — |
| **Grane** | ✅ nova grana sama zapamti iz koje je grane nastala · ✅ na startu sesije: grana, zadatak, šta čeka, preporuka modela i broj gotovih grana | `/grane`: sve grane sa stanjem (čeka pregled, stala, radi se, čeka granu, otvorena, stara, gotova) i jednom radnjom za svaku; brava ostala iza zatvorene sesije, sesije na gotovim granama i pogrešan model sesije · `/grane pocisti` (uz tvoje da) · `/grane nova <zadatak>` · `/grane ceka <X> <Y>` (X se spaja tek kad je Y gotova) |
| **Paralelni rad** | ✅ brava: u istom folderu piše samo jedna sesija (oslobađa se na kraju sesije, a istekne i nakon 20 min bez pisanja; worktree ima svoju bravu) · ✅ glavna sesija samostalne zadatke daje **pomoćnim sesijama**: kartica (klikneš), pomoćna radi u svom worktreeu i na kraju sama `/kraj-sesije auto`: testovi, commit, PR i squash spajanje u granu na kojoj je glavna bila (ne uvijek `main`), obavještenje, arhiviranje. Uz crvene testove, konflikt ili potrebnu odluku ne spaja nego javi „Čeka tebe". STATUS.md piše samo glavna | druga sesija ili Codex ide u **worktree**: `/codex-worktree <zadatak>`. Kad je gotovo, `/codex-worktree spoji <zadatak>` napravi **PR** (pregledaš diff i klikneš Merge na GitHubu), a ponovljeni `spoji` počisti worktree i granu (i kad je PR spojen squashom). Bez GitHuba se spaja lokalno. · `/preuzmi-lock` ako je prva sesija zatvorena |
| **Nešto se pokvarilo** | — | `/vrati`: odbaci nesnimljene izmjene ili poništi zadnje commitove. Ništa se ne briše zauvijek, a `/vrati poništi` vraća nazad |
| **Kraj rada** | ✅ podsjetnik kad ima ≥ 10 necommitovanih fajlova ili su stariji od 2 h · ✅ upozorenje kad razgovor pređe ~100k i ~150k tokena (svaka poruka je tada skuplja) · sesija vezana za PR se sama arhivira kad se PR spoji | `/kraj-sesije`: testovi, STATUS, commit, push (radna grana uz zelene testove sama, glavna grana po pravilu projekta; pomoćna sesija: `/kraj-sesije auto` sama spoji i zatvori se), jedno pitanje za opštu lekciju u `claude-licno/znanje/` (zapis samo uz tvoje da), pa ponudi **novu sesiju sa prvom stavkom iz „Sljedeće"** (u desktop aplikaciji kartica, jedan klik je otvara, a ova se arhivira; u terminalu gotov prompt za kopiranje; u cloud sesiji, npr. sa telefona, arhiviranje radi, a model druge sesije se ne može postaviti, pa ga biraš u njenom meniju); na „Ne" ponudi **zatvaranje sesije** kad je sve commitovano; ako je ostaviš otvorenu, `/kraj-sesije` oslobodi bravu (kad milestone završi: `Status` → `gotovo YYYY-MM-DD` u BLUEPRINT.md) · jednom po repou: uključi *Automatically delete head branches* (GitHub → Settings → General → Pull Requests), pa GitHub briše granu čim se PR spoji |
| **Napredak** | ✅ na startu sesije linija: milestone, % funkcija, kašnjenje, prognoza MVP-a | `/napredak` (terminal) · `/napredak html` (vizuelni pregled) · kad se kasni: smanji obim (`odloženo (v2)`), novi rok ili nastavi |
| **Aplikacija za korištenje** | — | `/objavi`: samo na ovom računaru (`Pokreni.cmd`, dvoklik), na kućnoj mreži (i telefon u kući) ili na internetu (hosting, instalacija na telefon). Kickstart zapisuje izbor u VIZIJA.md → `Gdje se koristi` |
| **MVP gotov** | ✅ Claude predloži izdanje umjesto novih funkcija (i prvo `/objavi`, ako README nema `Kako se koristi`) | `/izdanje`: CHANGELOG, tag v1.0, obim se zamrzava (održavanje). Nova verzija samo kroz plan sa rokovima |
| **Povremeno** | — | `/dubinska-provjera` (invarijante, mutacije testova, simulacija više perioda, statička analiza; uz ugrađene `/code-review` i `/security-review`) · `/provjera-izgleda` (`--regresija` kad je izgled usvojen) · `/trziste` u projektu (šta dalje razvijati prema konkurenciji) · `/isplativost <nova cijena>` · `/stanje` · `/docs-audit` (red u dokumentima) · `/kickstart --nadogradi` (novi šabloni u starom projektu) · `/pravilo-u-hook` (pravilo koje se zaboravlja postaje provjera) |
| **Hook smeta ili ima grešku** | — | `/zdravlje` (provjera instalacije, greške i spori hookovi) · `/pravila-pauza [minuta]` (tajne ostaju zaštićene) · `/pravila-pauza stop` · greške: `~/.claude/pravila.log` |

## Gdje je šta u projektu
| Fajl | Samo za |
|---|---|
| `AGENTS.md` | pravila (za Claude i Codex) |
| `CLAUDE.md` | uvozi AGENTS.md + ono što je samo za Claude |
| `STATUS.md` | trenutno stanje (≤ 30 linija, prepisuje se; duži se na startu skrati, a `/stanje` ga prepiše iz dnevnika u stanje) |
| `git log` | historija (ne piše se u .md) |
| `docs/VIZIJA.md` | problem, **Obim**, **Van obima** (čita ih čuvar obima) |
| `docs/TRZISTE.md` | (opciono) tržište, niše, isplativost i izvori (`/trziste`, `/isplativost`) ili predaja iz Oblaka ideja (`npm run predaj`) |
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
| Nov projekat, arhitektura, refaktor, analiza, plan, odluka, migracija, sigurnost, teški bug | Opus | visok |
| Svakodnevno kodiranje po planu | Sonnet | srednji |
| STATUS, dokumentacija, pravopis, tekst, README, CHANGELOG, čišćenje | Haiku | nizak |

Preporuku za sljedeći zadatak daju kartica nove sesije (`/kraj-sesije`, `/grane nova`) i start sesije. Model sesije u kojoj radiš biraš ti u meniju modela, jer sesija sama sebi ne može promijeniti model. Drugim sesijama ga može postaviti `/grane`. Skillovi i agenti iz plugina imaju svoj model upisan.

## 5 zlatnih pravila
1. Projekti u `C:\dev\`, nikad u OneDriveu. Sinhronizacija ide preko gita.
2. Commit poslije svakog zaokruženog koraka. Commit je save point.
3. Pravila su u AGENTS.md, stanje u STATUS.md, historija u git logu.
4. Jedan projekat = jedna tema. Nova tema dobija nov projekat.
5. Jedan agent = jedan folder (worktree) = jedna grana.

## Plugini
Repo: `C:\dev\claude-plugins` (GitHub: vvladimirv/claude-plugins) · instalacija i ažuriranje: `README.md` u tom repou.


## Instalacija pluginova
- Jedan repozitorij i pet paketa. `node scripts/setup.js` u repozitoriju prikazuje plan, `--apply` ažurira korisničku Claude instalaciju. Projektne instalacije se ne brišu.
- Shell i MCP nisu opći sigurnosni sandbox; nepodržane putanje ne predstavljaju potvrđenu zaštitu.
- `/zdravlje`: razlikuje opaženo izvršavanje hooka od potpune pokrivenosti; provjerava i svježinu dokaza projekta.
- `/provjera`: `.agent-checks.json` definiše obavezne komande; stage namjeravanih fajlova → runner → commit. Novi sadržaj ili Git indeks poništava raniji dokaz. Runner provjerava izlazni status, a projektna skripta mora odbiti nula testova i preskočene obavezne grupe.
- `/poslovna-pravila`: potvrđeni ulazi i očekivani rezultati prije promjene važnog ponašanja.
- `/pregled-izmjene`: read-only pregled posljedica diffa i dokaza testiranja. Recenzija nije zamjena za testove.
- `/arhitekta` i `/ux-recenzent`: skillovi i agenti; ciljni uređaji dolaze iz projekta.

# Zajednički sistem za Claude Code i Codex

Izvor je ovaj repozitorij. Tri postojeća plugina ostaju odvojeni paketi; svaki radi bez npm zavisnosti.
Claude čita `.claude-plugin`, Codex portable `plugin.json` i `.agents/plugins/marketplace.json`.
`node scripts/package-plugins.js` generiše Codex metapodatke iz Claude manifesta. Test čuva jednake verzije.
Instalacijski cache nije mjesto za ručne popravke. Izmjena ide u izvor, pa test, verzija i setup.

## Šta je zajedničko, a šta projektno

- Zajedničko: postupci, parseri, pravila zaštite, šabloni i testovi kompatibilnosti.
- Projektno: poslovna pravila, komande za testove, dozvoljeni uređaji i putanje, stanje i arhitektura.
- Postojeće `.claude/granice.json`, `zasticeno.txt`, `bez-kickstarta` i `kickstart.json` ostaju kompatibilne
  projektne postavke za oba alata. Naziv foldera nije dokaz da ih koristi samo Claude.
- Agent ne nameće Flask, React, mobilni prikaz, jedan test runner ni jedan model svim projektima.

## Instalacija i ažuriranje na računaru

1. `node scripts/setup.js` prikazuje tačne komande bez izmjena.
2. `node scripts/setup.js --apply` registruje ovaj lokalni izvor i osvježava tri korisničke instalacije u oba alata.
   `--claude` ili `--codex` bira samo jedan alat. Koriste se javni CLI-jevi; skripta ne prepisuje korisnički config.
3. Codex profili arhitekta/ux_recenzent kopiraju se iz paketa u korisnički agents folder. Različita prethodna datoteka dobija backup.
4. Otvoriti novi chat u oba alata. Codex povjerenje za izmijenjene hookove korisnik pregleda kroz `/hooks`.
   Setup ne upisuje niti zaobilazi internu bazu povjerenja.
5. `/zdravlje` i listanje plugina provjeravaju verzije i opaženo izvršavanje. Provjera svakog pravila je zaseban test.

Lokalna registracija omogućava testiranje i korištenje bez objavljivanja na internetu. Nakon `git pull` u izvoru
ponovo pokrenuti setup. Time se GitHub auto-update za ovu lokalnu registraciju zamjenjuje eksplicitnim lokalnim osvježavanjem.
Projektne instalacije starijih verzija se ne brišu: prvo ih pregledati i odlučiti koji projekti trebaju nadogradnju.
Ako CLI nije dostupan ili komanda padne, setup staje s greškom i navodi gdje. Djelimična instalacija nije uspjeh.

## Pokrivenost hookova

Codex shell pozive izlaže kao `Bash`. `apply_patch` odgovara matcheru `Edit|Write`, ali zadržava drugačiji ulaz.
Guard zato prvo parsira sve putanje patcha, provjerava zaštitu, pa projektuje sadržaj i koristi postojeća pravila.
Obuhvaćeni su Add, Update, Delete i Move, više fajlova i više hunkova. Duplikati putanja i format koji parser
ne razumije dobijaju vidljivu blokadu umjesto tihog preskakanja. Hook nikad ne primjenjuje patch.
PostToolUse čita stvarni rezultat, ne pokušava ponovo primijeniti izmjenu.

Claudeovo `ask` za nepoznat folder prevodi se u podržani Codex `deny` uz razlog. Agent zatim usklađuje
plan s korisnikovom već datom autorizacijom i projektnom dokumentacijom; ne pokušava drugi alat da zaobiđe pravilo.
Zaštita tajni ostaje aktivna i uz pauzu. Greška ostalih pravila dopušta nastavak, ali daje vidljivo upozorenje.
Brava je po radnom folderu i identitetu sesije, uz oznaku alata. Git hook prihvata samo identitet vlasnika:
`CC_AGENT_SESSION_ID`, `CLAUDE_CODE_SESSION_ID` ili `CODEX_THREAD_ID`. Nepoznat identitet nije vlasnik.

Ovo nije opći sandbox za proizvoljan kod. Shell provjera naziva i putanja ne može dokazati sve ponašanje
dinamičke skripte. MCP alati koji pišu fajlove nisu automatski obuhvaćeni Write/Edit provjerama.
Sistemske dozvole i Git/CI provjere ostaju zasebni slojevi. Ključna pokrivenost testira se i stvarnim probama u alatima.

## Dokaz provjera projekta

`.agent-checks.json` definiše obavezne komande kao argv, bez shell spajanja:

```json
{"checks":[{"name":"testovi","command":"node","args":["scripts/test.mjs"]}]}
```

Runner iz guarda je `plugins/project-guard/scripts/checks.js`. Projekt dobija identičnu samostalnu kopiju
`scripts/checks.cjs` kroz šablone. Prvo stage namjeravanih fajlova, pa `node scripts/checks.cjs`, zatim commit.
`--verify` samo provjerava postojeći zapis. Zapis je u Git metapodacima worktreea i ne commituje se.
SHA-256 pokriva plan, Git indeks i sadržaj tracked i neignorisanih untracked fajlova. Ignorisane build/test
artefakte urediti kroz projektni `.gitignore`; promjene izvora ne smiju biti ignorisane radi zaobilaženja provjere.
Promjena tokom provjere, nedostajuća komanda, timeout i pad bilo koje obavezne komande znače nepotpun rezultat.

Runner vjeruje izlaznim kodovima komandi. Projektna skripta mora odbiti preskočenu obaveznu grupu i nula izvršenih
testova. Lokalni zapis nije nekrivotvoriv: za prihvatanje PR-a uključiti nezavisni CI i potrebne statusne provjere.
Hookovi se mogu zaobići lokalnim Git opcijama; zaštita grane na serveru je poseban sloj i podešava se po projektu.
Početni kostur bez testova još nema plan provjera i ne predstavlja se kao testirana aplikacija.

## Dodatni postupci

- `/poslovna-pravila`: potvrđeni primjeri prije promjene obračuna, dozvola i drugog važnog ponašanja.
- `/pregled-izmjene`: read-only recenzija posljedica i dokaza; samopregled se ne predstavlja kao nezavisan pregled.
- `/provjera`: pokretanje i provjera važenja dokaza.
- `/zdravlje`: verzije kroz CLI-jeve, zabilježeno izvršavanje oba runtimea i svježina projektnog dokaza.
- Codex parser veličine razgovora koristi posljednji input, ne kumulativnu potrošnju, i ne sabira keš dvaput.
- Arhitekta i UX recenzent imaju skillove za oba alata; ciljni uređaji dolaze iz projekta.

## Razvoj i prihvatanje izmjene

`npm test` provjerava pravila i stvarne commitove u privremenim repozitorijima. `claude plugin validate .`
provjerava marketplace; provjeriti i pojedinačne pakete. CI radi isti test skup na Windowsu i Linuxu.
Promjena šablona podiže verziju šablona i osvježava otisak; promjena paketa podiže oba manifesta i katalog.
Nova ili izmijenjena zaštita dobija najmanje dozvoljen i zabranjen primjer za svaki podržani runtime.
Podržani format transkripta i patcha je verzionisan testovima, ne pretpostavlja se da će budući formati raditi.

Izvori: [Codex hooks](https://learn.chatgpt.com/docs/hooks),
[pakovanje plugina](https://developers.openai.com/plugins/build/plugins).

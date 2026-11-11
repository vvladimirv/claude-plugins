# moji-pluginsi

Lični plugini za Claude Code i Codex za ispravan start i vođenje projekata.

| Plugin | Šta daje |
|---|---|
| `project-kickstart` | `/kickstart`: intervju → stack → arhitektura → blueprint → temeljni dokumenti + prvi commit · `--nadogradi` · `/nova-funkcija` · `/ui-izmjena` · `/adr` · agenti `arhitekta` (Opus) i `ux-recenzent` (Sonnet) · pre-commit i CI šabloni · `/pomoc`: podsjetnik |
| `project-memory` | na startu sesije: STATUS.md, zadnjih 10 commitova i linija napretka (rokovi, kašnjenje, prognoza) i pravilo „➡️ Sljedeće:“ · upozorenje kad razgovor postane velik · `/stanje` · `/kraj-sesije [auto]` · `/pomocna` (pomoćna sesija u worktreeu, sama spoji i zatvori se) · `/vrati` · `/napredak [html]` · `/objavi` · `/izdanje` · `/docs-audit` |
| `project-quality` | `/dubinska-provjera`: pravila koja ne smiju pasti na hiljadama slučajnih primjera, mutacije testova, simulacija više perioda i statička analiza, alati po stacku · `/provjera-izgleda`: snimci ekrana po ulogama i širinama, prelom, konzola, pristupačnost (axe-core), Lighthouse, `--regresija` · `/mockup-izgleda`: HTML varijante novog izgleda prije izmjene |
| `project-market` | `/trziste`: kupci, konkurenti, cijene, signali potražnje, bodovanje niša i prijedlozi razvoja, sa izvorom za svaki broj · `/isplativost`: troškovi, marža, prag isplativosti u tri scenarija, presuda i test najrizičnije pretpostavke · rezultat u `docs/TRZISTE.md`, koji `/kickstart` čita |
| `project-guard` | hookovi: zaštita tajni, kapija kickstarta, brava sesija, limit fajlova, boje iz tokena, čuvar obima (i zamrzavanje poslije izdanja), podsjetnik na commit, nova zavisnost = ADR, opis grana (baza, zadatak, preporuka modela) · `/grane` · `/zdravlje` · `/pravila-pauza` · `/preuzmi-lock` · `/novi-projekat` · `/ideja` · `/codex-worktree` · `/pravilo-u-hook` |

Svakodnevni podsjetnik (šta je automatski, a šta radiš ti): [PODSJETNIK.md](plugins/project-kickstart/skills/pomoc/PODSJETNIK.md). U Claude Codeu ga prikazuje `/pomoc`.

## Zajednička instalacija za Claude Code i Codex

Izvor je jedan repozitorij za sve projekte. Potrebni su Node.js 18+ za hookove, git i CLI izabranog alata;
razvojni testovi koriste Node.js 24. Projektna pravila ostaju u projektima.

```powershell
node scripts/setup.js
node scripts/setup.js --apply
```

Prva komanda samo prikazuje plan. Druga osvježava korisničke instalacije oba alata iz ovog lokalnog foldera
kroz njihove CLI-jeve. `--claude` ili `--codex` ograničava instalaciju. Codex profili se ažuriraju uz backup.
Setup registruje Codex hookove u korisnički `hooks.json`, bez duplog učitavanja iz paketa i bez mijenjanja povjerenja.
Nakon ažuriranja otvori novi chat; u Codexu pregledaj nove ili promijenjene hookove kroz `/hooks`.
Projektne instalacije se ne brišu: postojeći pokazivači na isti izvor usklađuju se uz backup konfiguracije.
Posebni projektni izvori i aktivne brave ostaju netaknuti. Povjerenje hookova se ne odobrava automatski.

Poslije `git pull` ponovi setup. Lokalni izvor se osvježava ovim postupkom; GitHub auto-update
ne preuzima izmjene umjesto lokalnog `git pull`. Za drugi računar kloniraj isti repo i pokreni setup.
Ne uređuj instalacijski cache.

Detaljno: [podržane zaštite, ograničenja i dokaz testiranja](docs/UNIVERZALNI-PLUGINI.md).

### Podešavanje po računaru (jednom)
- **Korijen projekata:** kapija kickstarta važi samo za foldere ispod `C:dev`. Ako su projekti na laptopu negdje drugdje, upiši putanju (jednu po liniji) u `~/.claude/kickstart-korijeni.txt`.
- **Lista ideja** (`/ideja`, `/novi-projekat`): privatni repo `vvladimirv/ideje`, kloniran u `<korijen>/ideje`:
  ```bash
  gh repo clone vvladimirv/ideje C:/dev/ideje
  ```

Na kraju otvori novi chat i otkucaj `/zdravlje`: pokaže šta još fali.

## Cloud sesije (claude.ai/code, telefon)
Cloud sesija svaki put dobije nov kontejner, a marketplace je tu ugašen (`SKIP_PLUGIN_MARKETPLACE=true`). Zato `claude plugin install` i `enabledPlugins` tu ne rade. Pluginovi se učitavaju iz foldera, preko varijable `CLAUDE_CODE_PLUGIN_DIRS` (folder sa više pluginova učita svaki od njih).

Okruženje `moji-pluginsi` (meni okruženja u naslovu sesije → Edit):
- **Environment variables** (dvije linije):
  ```
  CLAUDE_CODE_PLUGIN_DIRS=/opt/moji-pluginsi/plugins
  CLAUDE_CODE_PLUGIN_DIR_WATCH=1
  ```
- **Setup script:**
  ```bash
  #!/bin/bash
  # v3
  LOG=/opt/moji-pluginsi.log
  date > "$LOG"
  if git clone --depth 1 https://github.com/vvladimirv/claude-plugins.git /opt/moji-pluginsi >> "$LOG" 2>&1; then
    echo "OK" >> "$LOG"
  else
    echo "KLON NIJE USPIO" >> "$LOG"
  fi
  ```
Sesije za bilo koji projekat pokreći u tom okruženju. Provjera u sesiji: `claude plugin list` (svih pet `√ loaded`), a ako ne radi, `cat /opt/moji-pluginsi.log`.

- **Repo mora biti javan.** Git u cloud sesiji ima prijavu samo za repoe te sesije, pa privatni repo setup skripta ne može klonirati.
- **Nova verzija stiže sama** (od project-guard 0.6.2). Okruženje pamti stanje poslije setup skripte i daje ga svakoj novoj sesiji, pa je klon u `/opt/moji-pluginsi` star. Zato project-guard na startu sesije povuče klon sa GitHuba (samo fast-forward i samo ako u klonu nema izmjena) i javi nove verzije. Izmijenjeni hookovi rade odmah. `CLAUDE_CODE_PLUGIN_DIR_WATCH=1` govori Claude Codeu da sam ponovo učita plugin kad mu se fajlovi promijene, pa bi i izmijenjeni skillovi i nove komande trebali važiti u istoj sesiji (to još nije provjereno u cloud sesiji). Ako nešto ipak ne stigne, ili je greška u `~/.claude/pravila.log` (`selfupdate`): izmijeni skriptu (podigni broj u `# v3`), pa nove sesije kloniraju svjež `main`.
- Hookovi rade (Node je u kontejneru). Kapija kickstarta važi samo ispod korijena projekata (`C:\dev` ili `~/.claude/kickstart-korijeni.txt`), pa u cloudu ne smeta.

## Razvoj

```powershell
npm test
node scripts/package-plugins.js
claude plugin validate .
```

- Claude manifesti su izvor verzija; paketiranje generiše Codex manifeste i katalog.
- Poslije izmjene šablona podigni verziju šablona, upiši changelog i pokreni `node test/sablon-hash.js --upisi`.
- Testovi koriste privremene projekte; CI na GitHubu (`.github/workflows/ci.yml`) provjerava Windows i Linux na svaki push i pull request.
- `.agent-checks.json` definiše obavezne provjere. Stage namjeravanih fajlova, zatim `npm run check`, pa commit.
- Neobjavljena grana nije isto što i instaliran paket. Setup koristi folder iz kojeg je pokrenut.
- Probaj plugin bez instalacije, u probnom projektu: `claude --plugin-dir C:devclaude-pluginsplugins<plugin>`.
- Objava: podigni `version` u `plugin.json` i `marketplace.json`, commit, push. Cloud sesije uzimaju `main` sa GitHuba; ostali računari `git pull` pa `node scripts/setup.js --apply`.

## Novi postupci

| Postupak | Svrha |
|---|---|
| `/provjera` | Pokretanje obaveznih provjera i dokaz vezan za trenutni kod i Git indeks |
| `/poslovna-pravila` | Potvrđeni primjeri prije izmjene važnog ponašanja |
| `/pregled-izmjene` | Završna recenzija diffa i dokaza testiranja |
| `/zdravlje` | Instalacija, zabilježeno izvršavanje oba alata i svježina provjera |

Raniji skillovi i projektne postavke ostaju podržani. Opšti hook nije potpuni sigurnosni sandbox:
nepodržani alati i dinamičke shell skripte traže dodatne slojeve dozvola i Git/CI provjere.

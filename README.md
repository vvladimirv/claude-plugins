# moji-pluginsi

Lični Claude Code pluginovi za ispravan start i vođenje projekata.

| Plugin | Šta daje |
|---|---|
| `project-kickstart` | `/kickstart`: intervju → stack → arhitektura → blueprint → temeljni dokumenti + prvi commit · `--nadogradi` · `/nova-funkcija` · `/ui-izmjena` · `/adr` · agenti `arhitekta` (Opus) i `ux-recenzent` (Sonnet) · pre-commit i CI šabloni · `/pomoc`: podsjetnik |
| `project-memory` | na startu sesije: STATUS.md, zadnjih 10 commitova i linija napretka (rokovi, kašnjenje, prognoza) i pravilo „➡️ Sljedeće:“ · upozorenje kad razgovor postane velik · `/stanje` · `/kraj-sesije [auto]` · `/pomocna` (pomoćna sesija u worktreeu, sama spoji i zatvori se) · `/vrati` · `/napredak [html]` · `/objavi` · `/izdanje` · `/docs-audit` |
| `project-guard` | hookovi: zaštita tajni, kapija kickstarta, brava sesija, limit fajlova, boje iz tokena, čuvar obima (i zamrzavanje poslije izdanja), podsjetnik na commit, nova zavisnost = ADR, opis grana (baza, zadatak, preporuka modela) · `/grane` · `/zdravlje` · `/pravila-pauza` · `/preuzmi-lock` · `/novi-projekat` · `/ideja` · `/codex-worktree` · `/pravilo-u-hook` |

Svakodnevni podsjetnik (šta je automatski, a šta radiš ti): [PODSJETNIK.md](plugins/project-kickstart/skills/pomoc/PODSJETNIK.md). U Claude Codeu ga prikazuje `/pomoc`.

## Instalacija (jednom po računaru)
Potrebno: Claude Code, git, Node.js (hookovi su Node skripte).

```bash
claude plugin marketplace add vvladimirv/claude-plugins
claude plugin install project-kickstart@moji-pluginsi
claude plugin install project-memory@moji-pluginsi
claude plugin install project-guard@moji-pluginsi
```
Zatim u `~/.claude/settings.json`, pod `extraKnownMarketplaces.moji-pluginsi`, dodaj `"autoUpdate": true`. Tako računar sam povlači nove verzije. Repo je javan, pa za instalaciju i ažuriranje ne treba prijava na GitHub (za push i dalje treba).

Na kraju restartuj Claude Code (desktop app ili terminal sesiju) i otkucaj `/zdravlje`: pokaže šta još fali.

### Podešavanje po računaru (jednom)
- **Korijen projekata:** kapija kickstarta važi samo za foldere ispod `C:\dev`. Ako su projekti na laptopu negdje drugdje, upiši putanju (jednu po liniji) u `~/.claude/kickstart-korijeni.txt`.
- **Lista ideja** (`/ideja`, `/novi-projekat`): privatni repo `vvladimirv/ideje`, kloniran u `<korijen>/ideje`:
  ```bash
  gh repo clone vvladimirv/ideje C:/dev/ideje
  ```

Na drugom računaru možeš otvoriti Claude Code i reći: *"instaliraj moje plugine po README-u iz github.com/vvladimirv/claude-plugins"*.

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
  # v2
  LOG=/opt/moji-pluginsi.log
  date > "$LOG"
  if git clone --depth 1 https://github.com/vvladimirv/claude-plugins.git /opt/moji-pluginsi >> "$LOG" 2>&1; then
    echo "OK" >> "$LOG"
  else
    echo "KLON NIJE USPIO" >> "$LOG"
  fi
  ```
Sesije za bilo koji projekat pokreći u tom okruženju. Provjera u sesiji: `claude plugin list` (sva tri `√ loaded`), a ako ne radi, `cat /opt/moji-pluginsi.log`.

- **Repo mora biti javan.** Git u cloud sesiji ima prijavu samo za repoe te sesije, pa privatni repo setup skripta ne može klonirati.
- **Nova verzija stiže sama** (od project-guard 0.6.2). Okruženje pamti stanje poslije setup skripte i daje ga svakoj novoj sesiji, pa je klon u `/opt/moji-pluginsi` star. Zato project-guard na startu sesije povuče klon sa GitHuba (samo fast-forward i samo ako u klonu nema izmjena) i javi nove verzije. Izmijenjeni hookovi rade odmah. `CLAUDE_CODE_PLUGIN_DIR_WATCH=1` govori Claude Codeu da sam ponovo učita plugin kad mu se fajlovi promijene, pa bi i izmijenjeni skillovi i nove komande trebali važiti u istoj sesiji (to još nije provjereno u cloud sesiji). Ako nešto ipak ne stigne, ili je greška u `~/.claude/pravila.log` (`selfupdate`): izmijeni skriptu (`# v2` → `# v3`), pa nove sesije kloniraju svjež `main`.
- Hookovi rade (Node je u kontejneru). Kapija kickstarta važi samo ispod korijena projekata (`C:\dev` ili `~/.claude/kickstart-korijeni.txt`), pa u cloudu ne smeta.

## Ažuriranje
```bash
claude plugin marketplace update moji-pluginsi
claude plugin update project-kickstart@moji-pluginsi
claude plugin update project-memory@moji-pluginsi
claude plugin update project-guard@moji-pluginsi
```

## Isključivanje
```bash
claude plugin disable project-memory@moji-pluginsi
```
Ako hook napravi problem, greške su u `~/.claude/pravila.log`. Hookovi su fail-open: greška ne blokira rad. Privremeno isključivanje blokirajućih pravila: `/pravila-pauza` ili env `CC_PRAVILA=off` (zaštita tajni ostaje).

Hookovi su Node skripte: jedan poziv traje ~0,2 s, od čega je većina samo pokretanje Node-a na Windowsu. Poziv kojem samo pravila traju duže od 200 ms upiše se u `pravila.log` kao `sporo/…`, a `/zdravlje` ih prebroji.

## Razvoj (u ovom repou)
1. Izmijeni plugin.
2. `npm test`: testovi hook skripti.
3. `claude plugin validate .`: provjera manifesta i skillova.
   Iste dvije provjere pokreće i CI na GitHubu (`.github/workflows/ci.yml`) na svaki push i pull request.
4. Probaj ga bez instalacije, u probnom projektu: `claude --plugin-dir C:\dev\claude-plugins\plugins\<plugin>`.
5. Podigni `version` u `plugin.json` i `marketplace.json`, commit, push. Tek tada ga dobijaju svi računari.

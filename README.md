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
Zatim u `~/.claude/settings.json`, pod `extraKnownMarketplaces.moji-pluginsi`, dodaj `"autoUpdate": true`. Tako računar sam povlači nove verzije. Repo je privatan, pa git mora imati sačuvanu prijavu za github.com: Git Credential Manager (dolazi uz Git for Windows) ili `gh auth login` + `gh auth setup-git`.

Na kraju restartuj Claude Code (desktop app ili terminal sesiju) i otkucaj `/zdravlje`: pokaže šta još fali.

### Podešavanje po računaru (jednom)
- **Korijen projekata:** kapija kickstarta važi samo za foldere ispod `C:\dev`. Ako su projekti na laptopu negdje drugdje, upiši putanju (jednu po liniji) u `~/.claude/kickstart-korijeni.txt`.
- **Lista ideja** (`/ideja`, `/novi-projekat`): privatni repo `vvladimirv/ideje`, kloniran u `<korijen>/ideje`:
  ```bash
  gh repo clone vvladimirv/ideje C:/dev/ideje
  ```

Na drugom računaru možeš otvoriti Claude Code i reći: *"instaliraj moje plugine po README-u iz github.com/vvladimirv/claude-plugins"*.

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
4. Probaj ga bez instalacije, u probnom projektu: `claude --plugin-dir C:\dev\claude-plugins\plugins\<plugin>`.
5. Podigni `version` u `plugin.json` i `marketplace.json`, commit, push. Tek tada ga dobijaju svi računari.

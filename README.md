# moji-pluginsi

Lični Claude Code pluginovi za ispravan start i vođenje projekata.

| Plugin | Šta daje |
|---|---|
| `project-kickstart` | `/kickstart`: intervju → stack → arhitektura → blueprint → temeljni dokumenti + prvi commit · `/pomoc`: podsjetnik |
| `project-memory` | na startu sesije: STATUS.md + zadnjih 10 commitova u kontekstu · `/stanje` · `/kraj-sesije` |

Svakodnevni podsjetnik (šta je automatski, a šta radiš ti): [PODSJETNIK.md](plugins/project-kickstart/skills/pomoc/PODSJETNIK.md). U Claude Codeu ga prikazuje `/pomoc`.

## Instalacija (jednom po računaru)
Potrebno: Claude Code, git, Node.js (hookovi su Node skripte).

```bash
claude plugin marketplace add vvladimirv/claude-plugins
claude plugin install project-kickstart@moji-pluginsi
claude plugin install project-memory@moji-pluginsi
```
Zatim u `~/.claude/settings.json`, pod `extraKnownMarketplaces.moji-pluginsi`, dodaj `"autoUpdate": true`. Tako računar sam povlači nove verzije. Repo je privatan, pa git mora imati sačuvanu prijavu za github.com: Git Credential Manager (dolazi uz Git for Windows) ili `gh auth login` + `gh auth setup-git`.

Na kraju restartuj Claude Code (desktop app ili terminal sesiju).

Na drugom računaru možeš otvoriti Claude Code i reći: *"instaliraj moje plugine po README-u iz github.com/vvladimirv/claude-plugins"*.

## Ažuriranje
```bash
claude plugin marketplace update moji-pluginsi
claude plugin update project-kickstart@moji-pluginsi
claude plugin update project-memory@moji-pluginsi
```

## Isključivanje
```bash
claude plugin disable project-memory@moji-pluginsi
```
Ako hook napravi problem, greške su u `~/.claude/pravila.log`. Hookovi su fail-open: greška ne blokira rad.

## Razvoj (u ovom repou)
1. Izmijeni plugin.
2. `npm test`: testovi hook skripti.
3. `claude plugin validate .`: provjera manifesta i skillova.
4. Probaj ga bez instalacije, u probnom projektu: `claude --plugin-dir C:\dev\claude-plugins\plugins\<plugin>`.
5. Podigni `version` u `plugin.json` i `marketplace.json`, commit, push. Tek tada ga dobijaju svi računari.

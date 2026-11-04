---
name: grane
description: Pregled svih grana projekta: šta je koja grana, koja koju čeka, šta je gotovo, gdje je nesnimljen rad i šta je sljedeći korak. Čisti gotove grane i otvara novu granu sa preporukom modela. Za "/grane", "koja grana je gotova", "izgubio sam se u granama".
argument-hint: [nova <zadatak> [--ceka <grana>] | pocisti | ceka <grana> <grana> | upisi …]
model: sonnet
allowed-tools: [Bash, Read, AskUserQuestion, ToolSearch, mcp__ccd_session__spawn_task, mcp__ccd_session_mgmt__list_sessions, mcp__ccd_session_mgmt__get_session, mcp__ccd_session_mgmt__set_session_model, mcp__ccd_session_mgmt__set_session_effort, mcp__ccd_session_mgmt__archive_session, mcp__claude-code-remote__list_sessions, mcp__claude-code-remote__get_session, mcp__claude-code-remote__archive_session]
---

# /grane

*Zašto:* paralelni rad otvara grane i foldere (worktree = drugi folder sa svojom granom iz istog repoa). Poslije nekog vremena ne znaš koja je gotova, koja čeka koju i gdje je ostao nesnimljen rad. Ovo je jedan pogled na sve, sa jednom radnjom po grani.

Argument: `$ARGUMENTS`

Skripta je u folderu ovog plugina: `<folder ovog skilla>/../../hooks/grane-cli.js` (dalje `<grane>`). Pokreći je iz korijena projekta. Ne treba STATUS.md ni druge dokumente projekta.

## Pregled (bez argumenta)
1. Pokreni `node "<grane>" pregled` i prikaži izlaz kakav jeste (nije blok koda).
2. **Sesije** (desktop ili cloud, vidi **Alati sesije**; ako alata nema, preskoči): ToolSearch `select:mcp__ccd_session_mgmt__list_sessions,mcp__ccd_session_mgmt__get_session,mcp__ccd_session_mgmt__set_session_model,mcp__ccd_session_mgmt__set_session_effort,mcp__ccd_session_mgmt__archive_session,mcp__claude-code-remote__list_sessions,mcp__claude-code-remote__get_session,mcp__claude-code-remote__archive_session`, pa `list_sessions` (limit 50).
   - Sesija pripada grani kad je njen `cwd` folder te grane (u cloudu: kad je grana u `session_context.outcomes[].git_repository.git_info.branches` iz `get_session`). Tačne putanje daje `node "<grane>" pregled --json` (`rows[].worktree`, `folders[].path`; glavni folder je `mainRoot`).
   - Predloži najviše 5 radnji:
     - grana 🔒 a u njenom folderu nema sesije sa `isRunning: true`: „brava je ostala iza zatvorene sesije", pa `/preuzmi-lock` u tom folderu,
     - neka sesija (nije arhivirana) radi u folderu gotove ili prazne grane: arhiviraj je,
     - sesija na otvorenoj, novoj ili grani koja čeka radi na drugom modelu nego što je preporuka iz pregleda (model sesije daje `get_session`): postavi preporučeni model i effort.
   - Pitaj jednim AskUserQuestion (multiSelect) koje od predloženih radnji da uradim, pa uradi samo izabrane. Model postavi sa `set_session_model` + `set_session_effort`. Ako `model` nije id iz menija, rezultat ih nabroji, pa uzmi onaj iz iste porodice (Opus, Sonnet, Haiku). Za skuplji model aplikacija sama traži potvrdu. Ova sesija sebi ne može promijeniti model. U cloudu alata za model druge sesije nema: radnju za model ne nudi, nego reci jednom rečenicom da se model te sesije mijenja u njenom meniju modela.
3. Zadnja linija je `➡️ Sljedeće:` sa najvažnijom radnjom, ovim redom: PR koji čeka pregled, pa grana koja je stala sa nesnimljenim radom, pa `/grane pocisti` (ako ima gotovih ili praznih), pa nastavak otvorene grane.

## `nova <zadatak> [--ceka <grana>]`
1. Preporuka: `node "<grane>" preporuka "<zadatak>"` (pravila su u **Preporuka modela** ispod). Ako je korisnik rekao drugi model, važi njegov.
2. Baza je trenutna grana (`git branch --show-current`). Uz `--ceka X` baza je X, jer rad nastavlja na onome što X donosi. Ako je X ili baza na odvojenom HEAD-u, stani i pitaj.
3. Ako postoji `mcp__ccd_session__spawn_task` (desktop aplikacija; ako nije učitan, ToolSearch `select:mcp__ccd_session__spawn_task`), pozovi ga. Aplikacija sama napravi folder i granu za novu sesiju.
   - `title`: zadatak kao naredba, < 60 znakova, sa preporukom na kraju (npr. `Popravi pravopis u podsjetniku · Haiku/nizak`),
   - `tldr`: jedna-dvije rečenice bez žargona, uz preporuku modela i efforta,
   - `cwd`: korijen glavnog repoa (folder iznad `git rev-parse --path-format=absolute --git-common-dir`), samo ako ga shema alata ima; ako ga nema (cloud), prvi red prompta je `Korijen projekta: <putanja>`, a red `Prvo pokreni …` ide odmah ispod,
   - `prompt` mora stajati sam za sebe. Prvi red je `Prvo pokreni /grane upisi --zadatak "<zadatak>" --baza <baza> [--ceka <X>] --model <model> --effort <effort>.`, a zatim zadatak i bitan kontekst iz ove sesije. Zadnji red je: `Preporučen model: <Model>, effort <effort>. Ako ova sesija radi na drugom, reci korisniku da ga promijeni u meniju modela.` Bez tajni i ključeva.
   - Kad je kartica napravljena, reci jednom rečenicom: „Kartica za novu sesiju je ispod, jedan klik je otvara."
4. Ako `spawn_task` ne postoji ili javi grešku, ispiši gotov prompt u bloku koda i reci: „Otvori novu sesiju za ovaj projekat (u aplikaciji sa uključenim *worktree*) i zalijepi ovo."

## `pocisti`
1. Sesije koje rade: `list_sessions` (vidi **Pregled**, korak 2). Grane čiji folder ima sesiju sa `isRunning: true` (u cloudu: grana sesije čiji je `status_bucket` working ili blocked) idu u `--preskoci a,b`.
2. `node "<grane>" pocisti --spisak [--preskoci …]` i prikaži spisak. Ako je prazan, reci to i stani.
3. Pitaj (AskUserQuestion): **"Brišem ovih <N> stavki? Sve je već spojeno ili prazno, pa se ništa ne gubi."**, sa opcijama "Da, obriši" / "Ne".
4. **Da:** `node "<grane>" pocisti --izvrsi [--preskoci …]` i prikaži rezultat. ⚠️ linija znači da ta stavka nije obrisana (najčešće je folder otvoren u drugom programu). Reci to jednom rečenicom i nastavi.
5. Ako rezultat kaže da grane još postoje na GitHubu, pitaj posebno (AskUserQuestion): **"Obrisati ih i na GitHubu?"** sa "Da" / "Ne". Na "Da": jedna komanda `git push origin --delete <grana1> <grana2> …` (imena bez `origin/`). Zatim predloži jednom po repou uključiti *Automatically delete head branches* (GitHub → Settings → General → Pull Requests), da GitHub to radi sam.
6. Sesije koje su radile u obrisanim folderima ponudi za arhiviranje (`archive_session`).

## `ceka <X> <Y>`
Grana X čeka granu Y (X se spaja tek kad je Y gotova): `git config "branch.<X>.ceka" "<Y>"`. Za uklanjanje: `ceka <X> -`, pa `git config --unset "branch.<X>.ceka"`. Pokaži novi `pregled`.

## `upisi …`
Opis trenutne grane, najčešće prvi korak nove sesije: `node "<grane>" upisi <argumenti>` (`--zadatak`, `--baza`, `--ceka`, `--model`, `--effort`). Prikaži izlaz. Ako javi grešku (npr. grana već ima svoj rad, pa je ne prebacuje na drugu bazu), reci je korisniku i pitaj šta dalje.

## Alati sesije
Desktop aplikacija: `mcp__ccd_session_mgmt__*` (lista, detalji, model, effort, arhiviranje sa `session_id`). Cloud sesija (npr. sa telefona; `CLAUDE_CODE_REMOTE=true`): `mcp__claude-code-remote__list_sessions`, `get_session` i `archive_session`, bez alata za model. Koristi ono što ToolSearch nađe; arhiviranje ide uvijek sa `session_id` te sesije.

## Preporuka modela
- **Opus, effort visok:** arhitektura, refaktor, istraživanje, analiza, plan, odluka, migracija, sigurnost, težak bug.
- **Haiku, effort nizak:** STATUS, dokumentacija, pravopis, dijakritika, tekst, README, CHANGELOG, čišćenje.
- **Sonnet, effort srednji:** sve ostalo (svakodnevno kodiranje po planu).

Sesija sama sebi ne može promijeniti model: bira ga korisnik u meniju modela, a drugoj sesiji ga može postaviti `/grane`.

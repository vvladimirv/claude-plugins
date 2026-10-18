---
name: kraj-sesije
description: Kraj rada: testovi, STATUS.md, mali logični commitovi, push, pa nova sesija sa sljedećim zadatkom ili zatvaranje. Za "/kraj-sesije", "završavamo", "snimi sve".
argument-hint: "[auto [bazna-grana]]"
model: sonnet
allowed-tools: [Read, Write, Edit, Bash, Glob, Grep, AskUserQuestion, ToolSearch, PushNotification, mcp__ccd_session__spawn_task, mcp__ccd_session_mgmt__archive_session]
---

# /kraj-sesije: snimi save point

**Prvo, projekat bez kickstarta:** ako `STATUS.md` postoji, ovaj pasus preskoči i radi normalno. Ako ne postoji, a projekat ima fajl `.claude/bez-kickstarta`, ovu komandu ovdje ne izvršavaj i ništa ne pravi (ni `STATUS.md`, ni `CHANGELOG.md`, ni `docs/*`, ni `.claude/kickstart.json`). Reci korisniku da projekat ima svoj sistem dokumenata i da pravila rada nađe u `AGENTS.md`/`CLAUDE.md` projekta. Ako ta pravila kažu kako se ovaj posao ovdje radi, navedi to u jednoj rečenici. Zatim stani.

*Zašto:* necommitovan rad je rad bez save pointa. Ako sutra nešto krene po zlu, nema se na šta vratiti. Rad koji nije pushovan ne vidi ni druga sesija ni drugi računar. Svaka sesija završava čistim stanjem i zatvara se kad je posao gotov.

1. **Pregled:** `git status --short` i `git diff --stat`. Ako nema izmjena, preskoči na korak 6 (push, nova sesija i zatvaranje). Ako je grana iza GitHuba (`git status -sb` pokazuje `behind`), prvo `git pull --rebase`.
2. **Sigurnost:** u izmjenama ne smije biti `.env`, `data/`, stvarnih podataka ni ključeva. Ako ih vidiš, stani i pitaj.
3. **Testovi:** pokreni brze testove (vidi **Brzi testovi** ispod). Ako testovi padnu, **ne commituj**. Pokaži sažetak greške i pitaj korisnika: popraviti sada ili commitovati kao WIP na posebnu granu.
4. **STATUS.md:** osvježi ga po pravilima iz `/stanje` (prepiši, ≤ 30 linija, samo sadašnjost).
5. **Commitovi:** grupiši izmjene u logične cjeline (jedna cjelina = jedan commit). Poruke idu po Conventional Commits, opis na bosanskom, npr. `feat(budzet): unos troška`. STATUS.md ide u zadnji commit.
6. **Push:** ako repo ima `origin`, a grana ima commitove koji nisu na GitHubu, pitaj da li da pushujem. Push samo uz izričito "da".
7. **Završna poruka** (kratko): commitovi (hash + poruka), stanje testova, da li je pushovano i prva stavka iz "Sljedeće" za sutra. Ako sekcija „Grane" sa starta sesije kaže da ima gotovih grana, dodaj jednu liniju: „<N> grana je gotovo → `/grane pocisti`".
8. **Nova sesija sa sljedećim zadatkom:** samo ako je sve prije uspjelo: testovi prošli, `git status` čist i push urađen (ili repo nema `origin`). Ako su testovi pali, commit nije uspio, push nije uspio ili ga je korisnik odbio, ili „Sljedeće" u STATUS.md nema nijednu stavku, ovaj korak preskoči i idi na korak 9.
   - Uzmi prvu stavku iz „Sljedeće" u STATUS.md (bez rednog broja). Za pitanje je skrati na jednu rečenicu, a u prompt ide cijela.
   - Model i effort za nju odredi po **Preporuka modela** ispod.
   - Pitaj (AskUserQuestion): **"Zatvaram ovu sesiju i pripremam novu sa zadatkom: <stavka>?"** sa opcijama "Da, nova sesija" (preporučeno, prva) / "Ne, samo završi".
   - **Da, nova sesija:**
     1. Ako alati nisu učitani, učitaj ih: ToolSearch `select:mcp__ccd_session__spawn_task,mcp__ccd_session_mgmt__archive_session`.
     2. Ako postoji `mcp__ccd_session__spawn_task` (desktop aplikacija), pozovi ga: `title` je zadatak kao naredba (< 60 znakova), `tldr` jedna-dvije rečenice bez žargona i na kraju preporuka (npr. „Preporuka: Sonnet, effort srednji."), `cwd` je korijen projekta (`git rev-parse --show-toplevel`; ako je sesija u worktreeu, korijen glavnog repoa, tj. folder iznad `git rev-parse --path-format=absolute --git-common-dir`). `prompt` mora stajati sam za sebe. Prvi red: `Ako postoji komanda /grane, prvo pokreni /grane upisi --zadatak "<stavka u jednoj rečenici>" --model <opus|sonnet|haiku> --effort <low|medium|high>.` Zatim `Pročitaj STATUS.md i nastavi: <cijela stavka>`, pa bitan kontekst iz ove sesije (grana, zadnji commit, šta je urađeno, otvorena pitanja i odluke korisnika). Zadnji red: `Preporučen model: <Model>, effort <effort>. Ako ova sesija radi na drugom, reci korisniku da ga promijeni u meniju modela.` Bez tajni i ključeva.
     3. Tek kad je kartica napravljena, reci jednom rečenicom: „Kartica za novu sesiju je ispod, jedan klik je otvara." Zatim oslobodi bravu naredbom iz koraka 9 („Ne, ostavi otvorenu"), jer arhiviranje je ne oslobađa uvijek, pa arhiviraj ovu sesiju alatom za arhiviranje (`session_id: "self"`, razlog: "kraj-sesije: nova sesija pripremljena"). Ako alata za arhiviranje nema, reci korisniku da ovu sesiju zatvori sa `/exit`.
     4. Ako `spawn_task` ne postoji (terminal, druga okruženja) ili javi grešku, ne arhiviraj i ne prijavljuj grešku. Ispiši gotov prompt u bloku koda (isti tekst kao u tački 2) i reci: „Otvori novu sesiju u ovom folderu i zalijepi ovo. Ovu zatvori sa `/exit`."
   - **Ne, samo završi:** idi na korak 9, kao do sada.
9. **Zatvaranje sesije:** ako je `git status` čist (sve je commitovano), pitaj (AskUserQuestion): **"Posao je gotov. Da zatvorim ovu sesiju?"** sa opcijama "Da, zatvori" / "Ne, ostavi otvorenu".
   - **Da:** u desktop aplikaciji oslobodi bravu naredbom iz „Ne, ostavi otvorenu" (ispod), pa arhiviraj ovu sesiju alatom za arhiviranje sesija (`session_id: "self"`, razlog: "kraj-sesije: sve commitovano"). Sesija se kasnije može otvoriti iz liste arhiviranih. Razgovor tu završava, pa završna poruka (korak 7) mora biti prije toga.
   - Ako alat za arhiviranje nije dostupan (terminal), reci korisniku da sesiju zatvori sa `/exit`.
   - **Ne, ostavi otvorenu:** oslobodi bravu ove sesije, da druga sesija u istom folderu ne čeka do 20 min. Iz korijena projekta pokreni doslovno (briše bravu samo ako je ova sesija drži; sljedeće pisanje u ovoj sesiji uzima je opet):
     ```bash
     node -e "const fs=require('fs'),f='.agent-lock.json';try{const l=JSON.parse(fs.readFileSync(f,'utf8'));if(l.session_id==='${CLAUDE_SESSION_ID}'){fs.unlinkSync(f);console.log('brava oslobođena')}else{console.log('brava je tuđa, nije dirana')}}catch(e){console.log(e.code==='ENOENT'?'brave nema':'brava nije dirana: '+e.message)}"
     ```
   - Ako ima necommitovanog rada, ne nudi zatvaranje, nego reci šta je ostalo. Brava ostaje, jer štiti nesnimljene izmjene.

## Režim auto (pomoćna sesija)
Kad je prvi argument `auto` (`$ARGUMENTS`), ovo je pomoćna sesija iz `/pomocna`: radi u svom worktreeu i sama spaja svoj rad. Drugi argument je bazna grana (nema ga → `main`). Korisnik je push i spajanje odobrio unaprijed, ali **samo uz zelene testove**. Ništa ne pitaj; ako nešto ne ide, vidi **Ne ide**.

1. Koraci 1–3 kao gore (bez `git pull --rebase`; rebase ide u tački 3). Korak 4 preskoči: STATUS.md piše samo glavna sesija. Ako je STATUS.md izmijenjen, vrati ga (`git checkout -- STATUS.md`).
2. Commitovi kao u koraku 5, na grani worktreea.
3. `git fetch origin`. Ako `git ls-remote --exit-code --heads origin <bazna>` ne nađe granu → **Ne ide**. Zatim `git rebase origin/<bazna>`; uz konflikt `git rebase --abort` → **Ne ide**. Ako je rebase donio tuđe commitove, ponovo brzi testovi (vidi **Brzi testovi**).
4. `git push -u origin HEAD`, pa `gh pr create --base <bazna> --title "<glavni commit>" --body "<commitovi i stanje testova>"` (opis završava linijom `🤖 Generated with [Claude Code](https://claude.com/claude-code)`), pa `gh pr merge <PR> --squash` i `git push origin --delete <grana>`. Provjeri: `gh pr view <PR> --json state` mora biti `MERGED`.
5. Završna poruka (kratko): PR link i šta je spojeno u <bazna>. Ako alati nisu učitani: ToolSearch `select:PushNotification,mcp__ccd_session_mgmt__archive_session`. `PushNotification`: „Gotovo i spojeno: <zadatak> (PR #N)". Zatim oslobodi bravu naredbom iz koraka 9 („Ne, ostavi otvorenu"), iz korijena worktreea, pa arhiviraj ovu sesiju (`archive_session`, `session_id: "self"`, razlog: "kraj-sesije auto: spojeno"). Aplikacija briše i worktree.
6. **Ne ide** (crveni testovi, konflikt u rebaseu, bazne grane nema na GitHubu, push, PR ili spajanje odbijeno, zadatak nije gotov, treba odluka korisnika): ne spajaj i ne arhiviraj, brava ostaje (čuva rad), `PushNotification` „Čeka tebe: <razlog u par riječi>", pa poruka šta je urađeno i šta treba, sa `➡️ Sljedeće:`.
7. Koraci 6, 8 i 9 (pitanje za push, nova sesija, zatvaranje) se u auto režimu ne izvode.

## Brzi testovi
Traži u folderu koji testiraš i uzmi prvo što postoji:
1. `scripts/test` (ili `scripts/test.mjs`, `.js`, `.ps1`),
2. komanda za brze testove iz `AGENTS.md` (sekcija „Komande" ili „Brzi testovi"),
3. `npm run test:fast`, ako `package.json` ima skriptu `test:fast`.

Ako nema ničega, pitaj korisnika koju komandu da pokreneš.

## Preporuka modela
- **Opus, effort visok:** arhitektura, refaktor, istraživanje, analiza, plan, odluka, migracija, sigurnost, težak bug.
- **Haiku, effort nizak:** STATUS, dokumentacija, pravopis, dijakritika, tekst, README, CHANGELOG, čišćenje.
- **Sonnet, effort srednji:** sve ostalo (svakodnevno kodiranje po planu).

Sesija sama sebi ne može promijeniti model: bira ga korisnik u meniju modela, a drugoj sesiji ga može postaviti `/grane`.

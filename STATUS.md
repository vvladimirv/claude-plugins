# STATUS

**Ažurirano:** 2026-11-28 · Faza 3: usklađivanje pluginova i lični sloj (`claude-licno`)

## Radi
- Šest pluginova: guard 0.12.4, kickstart 0.7.3, memory 0.9.0, quality 0.2.3, market 0.1.1, radni-stol 0.1.2; šabloni 0.5.2. Detalji: README i docs/UNIVERZALNI-PLUGINI.md.
- `project-guard`: tajne, kapija, brava (prepoznaje komande za čitanje: git, diff, petlje, PowerShell), sinhronizacija (i grana bez upstreama sa commitovima kojih nema na GitHubu), lični sloj (pull `claude-licno` i `claude-plugins`, poruka kad treba setup), obim, zavisnosti = ADR, Godot, limit fajlova, `/grane`, `/zdravlje` (šest pluginova + lični sloj), jedno upozorenje prije `claude --cloud` bez GitHub remotea ili sa necommitovanim izmjenama
- `project-memory`: STATUS u kontekstu (≤ 30 linija, isto pravilo kao `/stanje`), napredak, pomoćne sesije, `/kraj-sesije` (ff-only, push po pravilu projekta, linija „Zadnja sesija“ u STATUS-u, pitanje za lekciju u `claude-licno/znanje/`), `/stanje`, `/vrati`, `/objavi`, `/izdanje`, `/docs-audit`
- `project-kickstart`: `/kickstart` (`--lagano`, `--postojeci`, `--nadogradi`), `/nova-funkcija`, `/ui-izmjena` (maketa kroz `/mockup-izgleda` kad postoji), `/adr`, `/pomoc`, agenti `arhitekta` i `ux-recenzent`
- `project-quality`: `/dubinska-provjera`, `/provjera-izgleda`, `/mockup-izgleda`, `/balans` · `project-market`: `/trziste`, `/isplativost`
- Testovi čuvaju: verziju plugina uz svaku izmjenu (`test/plugin-hash.js --upisi`), `model:` u skillovima, kopije funkcija guard → memory. CI: `plugins.yml` (Windows i Linux), `ci.yml` (Linux + `claude plugin validate .`).
- `radni-stol` (ADR 0001): panel pored chata u desktop aplikaciji (gdje sam stao, dugmad koja samo upišu komandu, svi projekti); testovi `claude plugin test plugins/radni-stol` i u CI-ju.
- Spor hook u `~/.claude/pravila.log` sada navodi i sporo pravilo.

## Sljedeće
1. Spojiti PR Faze 3, pa na oba računara `node scripts/setup.js --apply` i novi chat; `/zdravlje` treba pokazati šest pluginova i lični sloj
2. Odluka o Codexu: prijedlog šta ukloniti (korist i rizik po stavci) je u bilješkama Faze 3; uklanjanje tek uz „da“
3. Poslije nekoliko dana pogledati `pravila.log`: ako je PreToolUse i dalje > 1 s, zapis kaže koje pravilo
4. Prva stvarna proba `/dubinska-provjera` i `/provjera-izgleda` na `Sole-KP`; `/trziste` i `/isplativost` na stvarnoj ideji
5. `/grane pocisti` ovdje i u `inhome`; uključiti *Automatically delete head branches* na GitHubu

## Blokeri / otvorena pitanja
- Cloud okruženje `moji-pluginsi`: setup skripta `# v3` iz README.md i `CLAUDE_CODE_PLUGIN_DIR_WATCH=1`, pa provjera verzija u novoj sesiji
- Drugi računar (laptop) još nije podešen po uputstvu iz OneDrivea (`claude-licno` + setup)

## Ograničenja
- Hook nije sandbox za proizvoljne shell/MCP radnje; brava prepoznaje uobičajene komande za čitanje, ostalo tretira kao pisanje.
- Povjerenje hookova i zaštita grane na GitHubu su zasebni koraci; instalacija ih ne odobrava.

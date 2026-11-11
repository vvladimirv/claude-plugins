# STATUS

**Ažurirano:** 2026-11-11 · memory radi i bez guarda (odluka: bez `dependencies`); nov plugin `project-market` (tržište i isplativost)

## Radi
- Jedan izvor za Claude Code i Codex; guard 0.7.5, kickstart 0.5.4, memory 0.6.3, quality 0.1.1, market 0.1.0; šabloni 0.5.1.
- `project-quality` (bez hookova): `/dubinska-provjera` (invarijante, mutacije, simulacija perioda, statička analiza; alati po stacku u `ALATI.md`), `/provjera-izgleda` (skripta `snimci.js`: Playwright + axe-core iz projekta ili `~/.cache/provjera-izgleda`, bez npm zavisnosti plugina), `/mockup-izgleda`
- `project-market` (bez hookova): `/trziste` (konkurenti, potražnja, niše, prijedlozi razvoja; izvor za svaki broj) i `/isplativost` (tri scenarija, prag, presuda); oba pišu `docs/TRZISTE.md`, a `/kickstart` ga čita u intervjuu
- `project-kickstart`: `/kickstart` (+ `--lagano` za male lične aplikacije, `--postojeci`, `--nadogradi` sa prelaskom lagano → puno), `/nova-funkcija`, `/ui-izmjena`, `/adr`, `/pomoc`, agenti `arhitekta` i `ux-recenzent`; šabloni sa CI i za Flutter/Dart i runnerom provjera
- `project-memory`: SessionStart kontekst (STATUS po sekcijama: „Sljedeće“ i „Blokeri“ uvijek cijeli), napredak, „➡️ Sljedeće:“, pomoćne sesije (`/pomocna`, `/kraj-sesije auto`), `/stanje`, `/kraj-sesije`, `/vrati`, `/objavi`, `/napredak`, `/izdanje`, `/docs-audit`
- `project-guard`: tajne, kapija, brava (i po worktreeu), sinhronizacija, čuvar obima, zavisnosti = ADR (i `pubspec.yaml`), limit fajlova, `/grane`, `/zdravlje`, `/codex-worktree`, samoosvježavanje u cloudu
- Cloud sesija: `/kraj-sesije`, `/pomocna` i `/grane` koriste i cloud imena alata (arhiviranje radi, model druge sesije ne)
- Lagani projekat: hookovi bez BLUEPRINT/INVENTAR/ARHITEKTURA/ADR šute, a čuvar obima i kapija rade
- Codex patch: zaštita svih putanja prije čitanja, projekcija sadržaja, brava, veličina, obim i zavisnosti; nepodržani format je vidljiv.
- Git šablon provjerava stvarnog vlasnika sesije i svjež dokaz provjera ako projekat ima plan.
- Samostalan runner i projektna kopija; sadržaj/planski indeks poništavaju stari rezultat; nije nekrivotvoriva potvrda.
- Skillovi poslovna-pravila, provjera i pregled-izmjene; objedinjeni Codex agent profili, ciljni uređaji iz projekta.
- Codex token_count parser; zdravstveni pregled razlikuje opaženo izvršavanje od potpune pokrivenosti.
- Setup koristi javne CLI-jeve i lokalni izvor; profili i projektne konfiguracije imaju backup. Iste izvore usklađuje, posebne izvore čuva; ne odobrava hookove.
- Codex koristi eksplicitni korisnički registar hookova, jer je CLI prikazivao nule za hookove iz paketa; paketi isključuju dupli Codex unos.
- CI ovog repoa (GitHub Actions): `npm test` i `claude plugin validate .` na Windowsu i Linuxu; test pazi da kopije funkcija guard → memory ne zaostanu
- Detalji i ograničenja: docs/UNIVERZALNI-PLUGINI.md.

## Sljedeće
1. Na oba računara `git pull` i `node scripts/setup.js --apply` (instalira i nove `project-quality` i `project-market`), pa novi chat (u Codexu pregledati hookove kroz `/hooks`); prva stvarna proba `/dubinska-provjera` i `/provjera-izgleda` na projektu `Sole-KP`
2. Prva proba `/trziste <ideja>` i `/isplativost` na stvarnoj ideji; tek onda `/nisa`, `/go-no-go` i agent `analiticar` (odloženo)
3. Postojeće projekte nadograđivati ciljano: sačuvati njihove komande, dodati plan i Git kontrole kad imaju stvarne testove
4. Probati `/kraj-sesije` u cloud sesiji sa telefona: kartica bez `cwd` i arhiviranje preko `get_session` id-a
5. Probati `/kickstart --lagano` na sljedećem malom projektu
6. `budzet`: M3 (Cloudflare Pages + PWA na Androidu), pa `/izdanje` v1.0; CI uključiti kad se sredi naplata na GitHubu
7. `/grane pocisti` u `inhome` i ovdje; grane spojenih PR-ova samo na GitHubu (`claude/admiring-curie-t5f1u9`, `claude/sleepy-edison-bnoe2w`, `claude/great-franklin-ehmh5c`) obrisati i uključiti *Automatically delete head branches*

## Blokeri / otvorena pitanja
- Worktreeovi: odluka (a), ostaje kako je. `/pomocna` već koristi nativni worktree, a `/codex-worktree` ostaje jer nativni ne radi za Codex
- Cloud: klon `/opt/moji-pluginsi` u ovom okruženju bio je zastario (guard 0.6.1, stari `/kraj-sesije`); u okruženju `moji-pluginsi` zamijeniti setup skriptu verzijom `# v3` iz README.md (i provjeriti da je `CLAUDE_CODE_PLUGIN_DIR_WATCH=1`), pa u novoj sesiji tog okruženja provjeriti „Pluginovi su osvježeni“ i verzije u `claude plugin list`
- Ostaje iz ranije: ručna proba pomoćne sesije sa glavnom na posebnoj grani; plugini na laptopu (`/zdravlje`); stranica komandi iz PODSJETNIK.md

## Ograničenja
- Hook nije sandbox za proizvoljne shell/MCP radnje; komande moraju vratiti neuspjeh za nepotpun obavezni prolaz.
- Korisničko povjerenje hookova i zaštita grane na GitHubu zasebni su koraci; instalacija ih ne odobrava.

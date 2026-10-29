# moji-pluginsi

Lični plugini za Claude Code i Codex za ispravan start i vođenje projekata.

| Plugin | Šta daje |
|---|---|
| `project-kickstart` | `/kickstart`: intervju → stack → arhitektura → blueprint → temeljni dokumenti + prvi commit · `--nadogradi` · `/nova-funkcija` · `/ui-izmjena` · `/adr` · agenti `arhitekta` (Opus) i `ux-recenzent` (Sonnet) · pre-commit i CI šabloni · `/pomoc`: podsjetnik |
| `project-memory` | na startu sesije: STATUS.md, zadnjih 10 commitova i linija napretka (rokovi, kašnjenje, prognoza) i pravilo „➡️ Sljedeće:“ · upozorenje kad razgovor postane velik · `/stanje` · `/kraj-sesije [auto]` · `/pomocna` (pomoćna sesija u worktreeu, sama spoji i zatvori se) · `/vrati` · `/napredak [html]` · `/objavi` · `/izdanje` · `/docs-audit` |
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
Nakon ažuriranja otvori novi chat; u Codexu pregledaj nove ili promijenjene hookove kroz `/hooks`.
Projektne instalacije se ne brišu i povjerenje hookova se ne odobrava automatski.

Poslije `git pull` ponovi setup. Lokalni izvor se osvježava ovim postupkom; GitHub auto-update
ne preuzima izmjene umjesto lokalnog `git pull`. Za drugi računar kloniraj isti repo i pokreni setup.
Ne uređuj instalacijski cache.

Detaljno: [podržane zaštite, ograničenja i dokaz testiranja](docs/UNIVERZALNI-PLUGINI.md).

## Razvoj

```powershell
npm test
node scripts/package-plugins.js
claude plugin validate .
```

- Claude manifesti su izvor verzija; paketiranje generiše Codex manifeste i katalog.
- Poslije izmjene šablona podigni verziju šablona, upiši changelog i pokreni `node test/sablon-hash.js --upisi`.
- Testovi koriste privremene projekte; CI provjerava Windows i Linux.
- `.agent-checks.json` definiše obavezne provjere. Stage namjeravanih fajlova, zatim `npm run check`, pa commit.
- Neobjavljena grana nije isto što i instaliran paket. Setup koristi folder iz kojeg je pokrenut.

## Novi postupci

| Postupak | Svrha |
|---|---|
| `/provjera` | Pokretanje obaveznih provjera i dokaz vezan za trenutni kod i Git indeks |
| `/poslovna-pravila` | Potvrđeni primjeri prije izmjene važnog ponašanja |
| `/pregled-izmjene` | Završna recenzija diffa i dokaza testiranja |
| `/zdravlje` | Instalacija, zabilježeno izvršavanje oba alata i svježina provjera |

Raniji skillovi i projektne postavke ostaju podržani. Opšti hook nije potpuni sigurnosni sandbox:
nepodržani alati i dinamičke shell skripte traže dodatne slojeve dozvola i Git/CI provjere.

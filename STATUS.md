# STATUS

**Ažurirano:** 2026-10-30 · univerzalni lokalni plugini

## Radi
- Jedan izvor za Claude Code i Codex; guard 0.7.1, kickstart 0.5.0, memory 0.6.0; šabloni 0.5.0.
- Codex patch: zaštita svih putanja prije čitanja, projekcija sadržaja, brava, veličina, obim i zavisnosti; nepodržani format je vidljiv.
- Git šablon provjerava stvarnog vlasnika sesije i svjež dokaz provjera ako projekat ima plan.
- Samostalan runner i projektna kopija; sadržaj/planski indeks poništavaju stari rezultat; nije nekrivotvoriva potvrda.
- Skillovi poslovna-pravila, provjera i pregled-izmjene; objedinjeni Codex agent profili, ciljni uređaji iz projekta.
- Codex token_count parser; zdravstveni pregled razlikuje opaženo izvršavanje od potpune pokrivenosti.
- Setup koristi javne CLI-jeve, lokalni izvor i backup profila; ne mijenja povjerenje hookova ni stare projektne instalacije.
- CI definisan za Windows i Linux; lokalna provjera i instalacijska proba upisuju se u završni izvještaj.
- Detalji i ograničenja: docs/UNIVERZALNI-PLUGINI.md. Prethodno stanje i zadaci su u git istoriji.

## Sljedeće
1. Poslije instalacije otvoriti novi chat u oba alata; u Codexu pregledati nove hookove kroz /hooks.
2. Postojeće projekte nadograđivati ciljano: sačuvati njihove komande, dodati plan i Git kontrole kad imaju stvarne testove.
3. Provjeriti novi CI na GitHubu nakon narednog pusha; Linux nije pokrenut lokalno na Windowsu.
4. Raniji otvoreni poslovi: ručna proba pomoćne sesije u baznu granu, drugi računar i cloud okruženje (prethodni STATUS u git istoriji).

## Ograničenja
- Hook nije sandbox za proizvoljne shell/MCP radnje; komande moraju vratiti neuspjeh za nepotpun obavezni prolaz.
- Korisničko povjerenje hookova i zaštita grane na GitHubu zasebni su koraci; instalacija ih ne odobrava.

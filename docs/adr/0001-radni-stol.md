# 0001: Šesti plugin „radni-stol“ (panel pored chata)

**Datum:** 2026-11-28 · **Status:** prihvaćeno

## Kontekst
Vlasnik radi na ~13 projekata i u svakom novom chatu mora ponovo saznati gdje je stao, sjetiti
se komandi i kako iz projekta doći do Laba i pluginova („odavno se gubim po alatima“). Kontekst i
pravila rada se ne ponavljaju: to već rade STATUS.md i GLOBALNO.md. Lab ADR 0009 je za to
predvidio lokalnu stranicu „Pregled“ na 127.0.0.1, sa svojim ADR-om prije gradnje. Claude desktop
aplikacija u međuvremenu dozvoljava mod: panel pored chata (`$.ui.open` + `ui.render` na `Pane`),
čitanje fajlova (`$.fs`), pokretanje `git`/`gh` (`$.process.run`) i upis teksta u polje za poruku
(`$.prompt.fill`).

Proba (korak 1, 2026-11-28, potvrdio vlasnik): mod u
`~/.claude/dev-mods/07c51399-207c-4af0-84cd-c62221e9ab10/radni-stol/` (T8) pokazuje „Sljedeće“ iz
STATUS.md, granu i broj necommitovanih fajlova, i tri dugmeta koja upišu uputu u polje. Panel se
vidi cijeli na 1366×768, a dugme upiše tekst. **Nije provjereno:** rad u drugom projektu (snimak u
dva projekta nije rađen) i rad kao instaliran plugin iz `moji-pluginsi` (proba je dev-mod jedne
sesije).

## Odluka
Pravi se šesti plugin `plugins/radni-stol` u marketplaceu `moji-pluginsi`: panel „Radni stol“
pored chata, u svakom projektu.

**Šta zamjenjuje, a šta ne dira**
- Zamjenjuje „Pregled“ iz Lab ADR 0009: lokalna stranica se ne pravi, Lab ostaje laboratorija
  AI testera.
- Ne duplira `/pomoc` + `PODSJETNIK.md`: podsjetnik ostaje jedini izvor komandi i tekstualna
  rezerva kad panel ne radi (npr. CLI ili cloud). Panel ga samo čita.
- Ekran „Alati i komande“ u Oblaku se ne proširuje; raniji plan proširenja Oblak interfejsa otpada.

**Tri dijela panela**
1. *Gdje sam stao:* iz STATUS.md trenutnog projekta Radi / Sljedeće / blokeri, grana,
   broj necommitovanih fajlova, otvoreni PR-ovi (`gh`).
2. *Komande:* iz `PODSJETNIK.md` one koje važe za ovaj projekat; dugme upiše uputu običnim
   riječima u polje.
3. *Svi projekti:* redovi iz `C:\dev\claude-licno\projekti.md` sa stanjem; samo pregled.

**Granice (važe za svaku verziju)**
- Samo čita: fajlove, `git` i `gh` komande za čitanje. Ne mijenja fajlove, ne commita, ne pusha.
- Nikad ne šalje poruku bez klika vlasnika: dugmad koriste `$.prompt.fill`, nikad
  `$.prompt.submit`. Vlasnik pogleda tekst i sam pošalje.
- Ne upravlja drugim chatovima ni sesijama (ne pokreće, ne zaustavlja, ne piše im).
- Bez poslova u pozadini (`claude -p`, zakazani zadaci, servisi).
- Kad nešto ne može pročitati (nema STATUS.md, nije git repo, nema `gh`), kaže to u jednoj
  rečenici umjesto praznog panela.

Dugme „Testiraj Labom“ postoji od prve verzije (izmjena 2026-11-28, odluka vlasnika): samo u web
projektima i samo kad na računaru postoji Lab (`kampanja/SKILL.md`), jer Lab već radi iz svakog
projekta preko putanje (PODSJETNIK). Dugme samo upiše „testiraj ovu aplikaciju Labom“; procjenu
troška i „da“ i dalje traži Claude u chatu.

## Razmotrene alternative
| Opcija | Zašto ne |
|---|---|
| Lokalna stranica „Pregled“ na 127.0.0.1 (Lab ADR 0009) | Poseban server i port za održavanje, prozor van chata, a komandu treba kopirati i zalijepiti. Panel je u istom prozoru i upisuje uputu direktno u polje. |
| Proširiti ekran „Alati i komande“ u Oblaku | Oblak odlučuje šta vrijedi praviti, ne prati rad u projektu; i on je prozor van chata. Miješao bi dva vlasnika istine (SISTEM.md). |
| Samo `/pomoc` + `PODSJETNIK.md` (ništa novo) | Već postoji, a vlasnik se i dalje gubi: treba se sjetiti da pozove `/pomoc`, a ne vidi stanje projekta ni ostale projekte. Ostaje kao rezerva. |
| Dugmad koja odmah šalju (`$.prompt.submit`) | Jedan pogrešan klik pokreće posao bez pregleda. Upis u polje košta jedan klik više, a vlasnik vidi šta šalje. |
| Panel koji pokreće poslove ili upravlja drugim chatovima | Van obima (pozadinski poslovi, upravljanje sesijama); Lab ADR 0009 je to već odbacio za registar i runner. |

## Posljedice
- Dobijamo: jedno mjesto pored chata za „gdje sam stao“ i komande, u svakom projektu, bez novog
  servera; podsjetnik ostaje jedan izvor istine.
- Plaćamo: šesti plugin za održavanje (verzija, hash, testovi, `/zdravlje` broji šest); radi samo
  u desktop aplikaciji (CLI i cloud ostaju na `/pomoc`); API modova je nov i može se promijeniti
  pri nadogradnji Claude Codea, pa plugin treba provjeriti pri većoj nadogradnji.
- Otvoreno prije prvog izdanja (korak 3): snimak u dva različita projekta i provjera da radi kao
  instaliran plugin, ne samo kao dev-mod.

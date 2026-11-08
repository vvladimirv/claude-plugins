---
name: mockup-izgleda
description: "Prijedlog novog izgleda bez diranja aplikacije: interaktivni HTML mockupi ključnih ekrana u 2-3 varijante stila, sa stvarnim rasporedom, ulogama i brojevima. Korisnik izabere, pa izmjena ide kroz /ui-izmjena."
argument-hint: "[ekrani ili cilj redizajna]"
model: sonnet
---

# /mockup-izgleda

*Zašto:* o izgledu se lakše odluči kad se vidi nego kad se opiše, a izmjena aplikacije prije odluke znači rad koji se baca. Mockup je jedna stranica koju korisnik otvori u pregledniku i prebacuje varijante. Aplikacija se ne mijenja dok korisnik ne izabere.

Zahtjev: `$ARGUMENTS` (prazno = 4–6 ekrana na kojima korisnici provode najviše vremena).

## 1. Ulaz
- Ako postoji svjež izvještaj `/provjera-izgleda`, kreni od njegovih 🔴 i 🟡 prijedloga. Ako ne postoji, predloži da se prvo uradi (bez nje mockup rješava nagađane probleme), ali nastavi ako korisnik želi.
- Pročitaj dizajn sistem i tokene projekta (`docs/DIZAJN-SISTEM.md`, fajl tokena), listu ekrana, pojmove domene i ciljne uređaje. Pogledaj trenutne snimke ekrana koje mijenjaš.
- Za svaki ekran zapiši šta korisnik na njemu radi i koje funkcije moraju ostati (inventar funkcija, ako postoji). Varijanta koja izgubi funkciju nije ispravna.

## 2. Varijante
Napravi 2–3 varijante koje se stvarno razlikuju (npr. gusta za stručnog korisnika koji cijeli dan unosi podatke, prozračnija za povremenog korisnika, i jedna smjelija). Uz svaku: jedna rečenica za koga je i šta žrtvuje.
- Ista struktura i podaci u svim varijantama; razlikuju se raspored, gustina, tipografija, boje i komponente.
- Realni podaci domene: prava imena polja, iznosi s pravim formatom (decimale, hiljade, valuta), duge tabele, prazno stanje i stanje greške bar na jednom ekranu.
- Uloge: ako se meni ili radnje razlikuju po ulozi, prekidač uloge u mockupu.
- Širine: mockup mora izgledati ispravno na ciljnim širinama projekta.
- Pristupačnost od starta: kontrast najmanje 4.5:1 za tekst, oznake uz polja, vidljiv fokus, rad tastaturom.
- Svaka varijanta definiše svoje vrijednosti kao CSS varijable (tokene) na jednom mjestu, da se izabrana kasnije direktno prenese u fajl tokena.

## 3. Isporuka
- Jedan samostalan HTML fajl (CSS i JS u njemu, bez vanjskih zavisnosti), s prekidačem varijante, ekrana i uloge. Ako alat podržava objavu stranice (Artifact), objavi je i pošalji link; inače fajl u `docs/mockupi/<datum>-<tema>.html` ili u zajednički folder projekta.
- Mockup nije dio aplikacije: ne ide u `templates/`, `src/` ni `static/`.
- Uz mockup kratka tabela: varijanta → za koga → šta se mijenja → novi tokeni/komponente → procjena rada.
- Pitaj korisnika da izabere varijantu (ili kombinaciju). Ne mijenjaj aplikaciju prije izbora.

## 4. Poslije izbora
Izabrana varijanta ide kroz `/ui-izmjena` (ili postupak projekta za izmjenu izgleda): tokeni prvo, pa komponente, pa ekrani, uz provjeru da nijedna funkcija nije izgubljena. Nakon usvajanja predloži `/provjera-izgleda --regresija`.

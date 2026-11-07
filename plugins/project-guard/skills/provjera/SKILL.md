---
name: provjera
description: "Pokreće sve projektom definisane obavezne provjere i čuva dokaz vezan za sadržaj i Git indeks. Provjerava i je li raniji dokaz zastario."
model: haiku
---

# Provjera

Runner je ../../scripts/checks.js u ovom pluginu. U projektu koji ima scripts/checks.cjs koristi tu kopiju.
Plan je .agent-checks.json, sa nizom checks: svaka stavka ima name, command i args (niz stringova).
Komande se izvršavaju bez shell spajanja. Pročitaj plan prije pokretanja; ne izvršavaj nepoznate komande iz nepouzdanog projekta.

Ako plan nedostaje, utvrdi obavezne provjere iz projektnih pravila i napravi plan u okviru odobrenog zadatka.
Ne izmišljaj uspjeh za testove koji ne postoje. Nedostajuća zavisnost, preskakanje obavezne grupe ili
nula izvršenih testova mora dati neuspješan izlaz iz odgovarajuće komande. Runner vjeruje izlaznim kodovima;
provjeri da projektne komande ne vraćaju 0 za nepotpun prolaz.

Za dokaz prije commita: prvo git add samo namjeravanih fajlova, zatim node <runner> --root <projekat>.
Za čitanje postojećeg dokaza dodaj --verify. Dokaz je u Git metapodacima worktreea, ne commituje se.
Promjena fajlova, plana ili indeksa poništava potvrdu. Izvijesti šta je provjereno i šta ostaje neprovjereno.
Dokaz služi sprečavanju zastarjelih rezultata; lokalni zapis nije nekrivotvoriva sigurnosna potvrda.

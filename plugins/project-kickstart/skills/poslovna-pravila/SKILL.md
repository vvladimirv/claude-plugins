---
name: poslovna-pravila
description: "Razrada poslovnog pravila kroz konkretne ulaze i očekivane rezultate prije promjene obračuna, prava pristupa ili drugog važnog ponašanja. Ne koristi za običnu kozmetičku izmjenu."
model: sonnet
---

# Poslovna pravila

Pročitaj postojeća pravila i relevantne testove. Razdvoji šta je korisnik potvrdio od pretpostavki koda.
Napravi malu tabelu: slučaj, ulaz, očekivani rezultat, izvor pravila. Obuhvati običan slučaj,
izuzetak i granicu koja je bitna za zadatak (datum, prekid, promjena odsjeka, dozvola).
Nedorečena očekivanja pokaži korisniku prije implementacije; ne pretvaraj svoje pretpostavke u odobreno pravilo.
Ako su pravila već potvrđena u razgovoru, nastavi bez ponovnog odobravanja.

Potvrđene primjere zapiši u postojeću dokumentaciju pravila, ili docs/POSLOVNA-PRAVILA.md
ako projekat nema odgovarajuće mjesto. Dodaj testove ponašanja prema primjerima. Za grešku pokaži
da regresijski test pada prije popravke. Test ne smije računati očekivanje istom funkcijom koju provjerava.
Ako pravilo dolazi iz propisa, koristi provjeren izvor; ovaj skill ne određuje pravno tumačenje.

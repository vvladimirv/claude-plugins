# Pravila koda

<!-- UPUTA: Konkretna pravila za ovaj stack. Kratko. AGENTS.md linkuje ovamo. -->

## Veličina
- Fajl: upozorenje na **300** linija, na **500** podjela je obavezna.
- Funkcija: do ~50 linija. Duža se dijeli na manje sa jasnim imenima.
- Kad fajl raste, prvo ga podijeli po odgovornostima, pa tek onda dodaj novo.

## Gdje šta ide
- Nova funkcija → `src/features/<ime>/` + F-broj u inventaru.
- Kod koji koristi samo jedna funkcija ostaje u njenom folderu, čak i ako izgleda "opće".
- `src/shared/` je samo za ono što stvarno koriste bar dvije funkcije.

## Imenovanje
- Kod na engleskom, imena iz `docs/POJMOVI.md`.
- {{KONVENCIJE_STACKA}} <!-- UPUTA: npr. camelCase/PascalCase za JS, snake_case za Python -->

## Testovi
- Test ponašanja za svaku F-funkciju (šta korisnik dobije, ne kako izgleda markup).
- Brza traka: `{{KOMANDA_BRZI_TESTOVI}}` (< 5 min), pokreće se prije svakog commita.
- Agenti testove pokreću preko `scripts/test`: tihi reporter, pun log u `test-log.txt`, na ekranu samo sažetak i najviše ~40 linija grešaka. Tako se ne troše tokeni na izlaz koji niko ne čita.
- E2E i screenshot testovi: CI i pre-commit. Screenshot se poredi mašinski, a agent gleda sliku samo kad test padne.

## Zavisnosti
- Prije nove biblioteke provjeri može li se bez nje. Ako ne može: kratak ADR.

# Dizajn sistem

<!-- UPUTA: Samo za projekte sa UI-jem. Jedan izvor istine za izgled. -->

## Tokeni
Sve vrijednosti su u **jednom fajlu**: `{{PUTANJA_TOKENA}}` (npr. `src/shared/ui/tokens.css`).
- Boje, razmaci, fontovi, radijusi, sjene i breakpointi nisu hardkodovani nigdje drugdje.
- Tamna tema redefiniše iste tokene i ne uvodi nove.

## Komponente (katalog)
| Komponenta | Putanja | Varijante |
|---|---|---|
| Dugme | `src/shared/ui/{{Button}}` | primarno, sekundarno, opasno |
| {{KOMPONENTA}} | | |

Ekrani se slažu samo od komponenti iz kataloga. Nova komponenta se prvo upiše ovdje.

## Principi
- Ciljni uređaji i širine iz `docs/VIZIJA.md` (`## Gdje se koristi`): {{CILJNI_UREDJAJI_I_SIRINE}}. Ne nameći mobilni prikaz desktop aplikaciji (ni obrnuto); 360 px važi samo kad projekat podržava mobitel.
- Pristupačnost: kontrast AA, fokus vidljiv, sve radi i tastaturom.
- {{PRINCIP_SPECIFICAN_ZA_PROJEKAT}}

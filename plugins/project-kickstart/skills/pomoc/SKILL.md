---
name: pomoc
description: Prikazuje podsjetnik rada sa projektima (šta je automatski, koje komande kad pokrenuti, gdje je šta, koji model za šta). Koristi kad korisnik kaže "/pomoc", "pomoć", "šta trebam raditi", "podsjeti me".
model: haiku
---

# /pomoc

Pročitaj `PODSJETNIK.md` iz foldera ovog skilla i prikaži ga korisniku **doslovno**, bez skraćivanja i bez dodavanja.

Ako je korisnik uz komandu postavio konkretno pitanje (`$ARGUMENTS`), prvo odgovori na njega u 1–3 rečenice na osnovu podsjetnika, pa ispod prikaži samo relevantnu sekciju.

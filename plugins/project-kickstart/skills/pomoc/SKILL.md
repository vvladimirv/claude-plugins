---
name: pomoc
description: Podsjetnik rada: šta je automatski, koje komande kad, gdje je šta, koji model za šta. Za "/pomoc", "šta trebam raditi".
model: haiku
allowed-tools: [Read]
---

# /pomoc

Pročitaj `PODSJETNIK.md` iz foldera ovog skilla i prikaži ga korisniku **doslovno**, bez skraćivanja i bez dodavanja.

Ako je korisnik uz komandu postavio konkretno pitanje (`$ARGUMENTS`), prvo odgovori na njega u 1–3 rečenice na osnovu podsjetnika, pa ispod prikaži samo relevantnu sekciju.

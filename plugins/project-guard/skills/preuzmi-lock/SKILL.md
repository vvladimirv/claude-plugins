---
name: preuzmi-lock
description: Preuzima bravu projekta (.agent-lock.json) od zatvorene ili srušene sesije, uz potvrdu.
model: haiku
allowed-tools: [Read, Bash, AskUserQuestion]
---

# /preuzmi-lock

*Zašto:* brava sprječava da dvije sesije prepisuju iste fajlove. Ako je sesija koja drži bravu zatvorena, brava sama istekne za 20 minuta. Ovo je brži put, ali samo kad si siguran da ona sesija više ne piše.

1. Pročitaj `.agent-lock.json` u korijenu projekta. Ako ne postoji, reci da brave nema i stani.
2. Pokaži korisniku: koji agent (`agent`), od kada (`since`), zadnja aktivnost (`heartbeat`, i prije koliko minuta).
3. Pitaj (AskUserQuestion): **"Da li je ta sesija zatvorena i da li preuzimam bravu?"**, sa opcijama "Da, preuzmi" / "Ne, otvoriću worktree".
   - Ako je druga sesija možda još aktivna, preporuči worktree: `git worktree add ../<projekat>-<zadatak> -b <grana>`.
4. Tek na "Da": obriši bravu:
   ```bash
   node -e "require('fs').unlinkSync('.agent-lock.json');console.log('brava oslobođena')"
   ```
   Ova sesija će bravu uzeti automatski pri prvom sljedećem pisanju.
5. Ako je druga sesija ostavila necommitovane izmjene (`git status --short`), reci to korisniku prije nastavka.

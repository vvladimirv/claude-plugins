# Izmjene šablona (za `/kickstart --nadogradi`)

Nova verzija ide na vrh. Svaka stavka kaže koji fajl u projektu i šta tačno treba dodati. Nadogradnja nikad ne prepisuje sadržaj projekta: samo dodaje ono što fali.

## 0.3.0
- **Nov:** `.githooks/pre-commit` + `.githooks/pre-commit.mjs` (iz `githooks/`). Zatim `git config core.hooksPath .githooks` i `git update-index --chmod=+x .githooks/pre-commit`.
- **Nov:** `.github/workflows/ci.yml` (iz `github-ci.yml`, prilagođen stacku).
- **AGENTS.md**, pravilo 10 (Paralelni rad): dodati rečenicu o `.agent-lock.json` i Codex worktreeu.
- **AGENTS.md**, pravilo 5 (Testovi): brzi testovi idu preko `scripts/test`, a E2E i screenshot testovi u CI (ako fali).

## 0.2.0
- **CLAUDE.md:** linija sa komandama `/nova-funkcija`, `/ui-izmjena`, `/ideja`.

## 0.1.0
- Početni skup: AGENTS.md, CLAUDE.md, STATUS.md, README.md, docs/ (VIZIJA, POJMOVI, ARHITEKTURA, BLUEPRINT, INVENTAR-FUNKCIJA, PRAVILA-KODA, adr/0001, DIZAJN-SISTEM i EKRANI za UI), fixtures/README.md, .claude/settings.json, .gitignore, .gitattributes, scripts/test.

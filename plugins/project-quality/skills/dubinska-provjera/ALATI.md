# Alati po stacku

Polazna lista. Ako projekt već ima alat iste namjene, koristi njegov. Prije instalacije provjeri trenutnu verziju i podršku za OS u zvaničnoj dokumentaciji alata; ova lista ne zamjenjuje tu provjeru.

| Stack | Invarijante (3a) | Mutacije (3b) | Tipovi / linter (3d) | Sigurnost (3d) |
|---|---|---|---|---|
| Python | Hypothesis (uz pytest) | mutmut (na Windowsu kroz WSL); cosmic-ray | mypy ili pyright, strogo za domenu | Bandit, Semgrep `p/python`, pip-audit |
| JavaScript / TypeScript | fast-check (`@fast-check/vitest` ili `@fast-check/jest`) | StrykerJS (`@stryker-mutator/core` + runner) | `tsc --noEmit` strict, ESLint | Semgrep `p/javascript`/`p/typescript`, `npm audit` |
| Dart / Flutter | glados | mutation_test (provjeriti na pub.dev) | `dart analyze`/`flutter analyze` sa strogim lintovima | Semgrep (ograničena podrška za Dart) |
| Go | rapid (`pgregory.net/rapid`) ili `testing/quick` | gremlins | `go vet`, staticcheck | gosec, govulncheck |
| C# / .NET | FsCheck ili CsCheck | Stryker.NET | nullable reference types, Roslyn analizatori | Security Code Scan, Semgrep `p/csharp` |
| Java / Kotlin | jqwik; Kotest property testing | PIT (pitest) | Error Prone; detekt (Kotlin) | SpotBugs + FindSecBugs, Semgrep |
| Rust | proptest | cargo-mutants | clippy | cargo-audit |

## Napomene
- **Semgrep:** `semgrep scan --config p/default` je dobar početak; za web dodati `p/owasp-top-ten`. Na Windowsu, ako izvorni klijent ne radi, kroz WSL ili Docker.
- **Novac:** za Python dodaj provjeru da domen ne koristi `float` za iznose (Semgrep pravilo ili test importa). Za JS/TS iznose drži u cijelim jedinicama (feninzi/centi) ili decimal biblioteci; fast-check generator neka daje cijele centi, ne `fc.float`.
- **Brzina:** mutacije su najsporije. Prvo jedan modul, izmjeri vrijeme, pa proširi. U CI-u ih pokreći rijetko (npr. sedmično ili ručno), ne na svaki push.
- **Baza:** invarijante nad repozitorijima i servisima rade nad pravom test bazom istog enginea kao produkcija, kad god projekt to ima za integracijske testove.
- **Simulacija (3c):** nema posebnog alata. To je skripta ili test projekta koji koristi javne servise aplikacije (ne direktan SQL), s fiksnim sjemenom (seed) da se rezultat može ponoviti.

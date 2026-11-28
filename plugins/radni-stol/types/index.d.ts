export type Dugme = { key: string; label: string; text: string; opis?: string }

export type StatusDijelovi = { radi: string[]; sljedece: string[]; blokeri: string[] }

export type Projekat = { folder: string; tip: string; stanje: string; pracenje: string }

export type PR = { broj: number; naslov: string; url: string }

export type Stanje = {
  projekat: string
  status: StatusDijelovi | null // null: nema STATUS.md
  gitGreska: string // prazno kad git radi
  grana: string
  necommitovano: number | null
  dugmad: { glavna: Dugme[]; projekat: Dugme[]; lab: Dugme | null; vise: Dugme[] }
  napomene: string[] // jedna rečenica za ono što panel nije mogao pročitati
  projekti: Projekat[] | null // null: projekti.md nije nađen
}

export type PRovi = { greska: string; lista: PR[] }

export type Prikaz = { vise: boolean; projekti: boolean }

declare module 'claude-code' {
  interface PluginState {
    'radni-stol': {
      stanje: Shaped<Stanje | null>
      prs: Shaped<PRovi | null>
      prikaz: Shaped<Prikaz>
    }
  }
}

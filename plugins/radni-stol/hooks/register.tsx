// Radni stol: panel pored chata (ADR 0001). Samo čita; dugme samo UPIŠE uputu u polje
// ($.prompt.fill), vlasnik je pogleda i sam pošalje. Nikad $.prompt.submit.

import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Dugme, Prikaz } from '../types'
import { ucitaj, ucitajPR } from './ucitaj'

const PANE = 'radni-stol'
const NASLOV = 'Radni stol'
const stanje = atom({ plugin: 'radni-stol', key: 'stanje' } as const, null, { shape: 'stanje-4' })
const prs = atom({ plugin: 'radni-stol', key: 'prs' } as const, null, { shape: 'prs-1' })
const prikaz = atom({ plugin: 'radni-stol', key: 'prikaz' } as const, { vise: false, projekti: false } as Prikaz, {
  shape: 'prikaz-1',
})

async function osvjezi($: EngineInterface) {
  const novo = await ucitaj($)
  await update($, stanje, () => novo)
}

async function osvjeziPR($: EngineInterface) {
  const novo = await ucitajPR($)
  await update($, prs, () => novo)
}

async function osvjeziSve($: EngineInterface) {
  await Promise.all([osvjezi($), osvjeziPR($)])
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const ran = await next(e)
    await $.command.register({ name: 'radni-stol', description: 'Otvori panel Radni stol' })
    void osvjeziSve($)
    $.clock.every(60_000, () => void osvjezi($))
    $.clock.every(300_000, () => void osvjeziPR($))
    void $.ui.open({ id: PANE, title: NASLOV })
    return ran
  })

  on('command.run', { command: 'radni-stol' }, async $ => {
    await osvjeziSve($)
    await $.ui.open({ id: PANE, title: NASLOV })
    return { text: 'Panel Radni stol je otvoren.' }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button, Link } = $.ui.resolve(e)
    const s = await read($, stanje)
    const p = await read($, prs)
    const v = await read($, prikaz)
    if (!s) return <Text dimColor>Učitavam…</Text>

    const upisi = (d: Dugme) => () => $.prompt.fill({ text: d.text })
    // Dugme i blijed opis u istom redu; opis se pojača dok je miš na dugmetu ili opisu (isti scope).
    const dugme = (d: Dugme, variant?: 'secondary', dim = false) => (
      <Box key={`r-${d.key}`} flexDirection="row" gap={1}>
        <Button key={d.key} variant={variant} dimColor={dim} hover={{ scope: d.key }} onPress={upisi(d)}>
          {d.label}
        </Button>
        {d.opis !== undefined && (
          <Text key={`o-${d.key}`} dimColor wrap="truncate-end" hover={{ scope: d.key, dimColor: false }}>
            {d.opis}
          </Text>
        )}
      </Box>
    )
    const red = (l: string, k: string) => (
      <Text key={k} wrap="wrap">
        {l}
      </Text>
    )
    const prebaci = (k: keyof Prikaz) => () => update($, prikaz, x => ({ ...x, [k]: !x[k] }))
    const aktivni = (s.projekti ?? []).filter(r => r.pracenje === 'aktivan')
    const ostali = (s.projekti ?? []).length - aktivni.length

    return (
      <Box flexDirection="column" gap={1}>
        <Box flexDirection="column">
          <Text bold>Gdje sam stao · {s.projekat}</Text>
          {s.gitGreska !== '' ? (
            <Text dimColor>{s.gitGreska}</Text>
          ) : (
            <Text>
              Grana {s.grana} · necommitovano {s.necommitovano === null ? '?' : s.necommitovano}
            </Text>
          )}
          {s.status === null && <Text dimColor>Nema STATUS.md u ovom folderu.</Text>}
          {s.status !== null && (
            <Box flexDirection="column">
              <Text bold>Sljedeće</Text>
              {s.status.sljedece.length === 0 && <Text dimColor>STATUS.md nema dio „Sljedeće“.</Text>}
              {s.status.sljedece.map((l, i) => red(l, `s${i}`))}
              {s.status.blokeri.length > 0 && <Text bold>Blokeri</Text>}
              {s.status.blokeri.map((l, i) => red(l, `b${i}`))}
              {s.status.radi.length > 0 && <Text bold>Radi</Text>}
              {s.status.radi.map((l, i) => (
                <Text key={`r${i}`} dimColor wrap="truncate-end">
                  {l}
                </Text>
              ))}
            </Box>
          )}
          <Text bold>Otvoreni PR-ovi</Text>
          {p === null && <Text dimColor>Učitavam…</Text>}
          {p !== null && p.greska !== '' && <Text dimColor>{p.greska}</Text>}
          {p !== null && p.greska === '' && p.lista.length === 0 && <Text dimColor>Nema otvorenih.</Text>}
          {p?.lista.map(pr => (
            <Link key={`pr${pr.broj}`} href={pr.url} label={`#${pr.broj} ${pr.naslov}`} />
          ))}
        </Box>

        <Box flexDirection="column" gap={1}>
          <Text bold>Komande</Text>
          <Text dimColor>Dugme samo upiše uputu u polje; pošalješ ti.</Text>
          <Box flexDirection="column">{s.dugmad.glavna.map(d => dugme(d))}</Box>
          {s.dugmad.projekat.length > 0 && (
            <Box flexDirection="column">{s.dugmad.projekat.map(d => dugme(d, 'secondary'))}</Box>
          )}
          {s.dugmad.lab !== null && dugme(s.dugmad.lab, 'secondary')}
          {s.dugmad.vise.length > 0 && (
            <Button key="vise" plain dimColor onPress={prebaci('vise')}>
              {v.vise ? '▾ Manje' : `▸ Više (${s.dugmad.vise.length})`}
            </Button>
          )}
          {v.vise && <Box flexDirection="column">{s.dugmad.vise.map(d => dugme(d, 'secondary', true))}</Box>}
          {s.napomene.map((n, i) => (
            <Text key={`n${i}`} dimColor wrap="wrap">
              {n}
            </Text>
          ))}
        </Box>

        <Box flexDirection="column">
          <Button key="projekti" plain onPress={prebaci('projekti')}>
            {v.projekti ? '▾ Svi projekti' : `▸ Svi projekti (${aktivni.length} aktivnih)`}
          </Button>
          {s.projekti === null && <Text dimColor>Nije nađen claude-licno/projekti.md.</Text>}
          {v.projekti &&
            aktivni.map(r => (
              <Text key={`pj-${r.folder}`} bold={r.folder === s.projekat} wrap="truncate-end">
                {r.folder === s.projekat ? '▸ ' : ''}
                {r.folder} · <Text dimColor>{r.stanje}</Text>
              </Text>
            ))}
          {v.projekti && ostali > 0 && <Text dimColor>+ {ostali} parkiranih ili ugašenih (projekti.md)</Text>}
        </Box>

        <Button key="osvjezi" plain dimColor onPress={() => osvjeziSve($)}>
          Osvježi
        </Button>
      </Box>
    )
  })
}

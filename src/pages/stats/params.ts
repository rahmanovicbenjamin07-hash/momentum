import { useSearchParams } from 'react-router'

/** Read and change one search param, keeping the others (and replacing history, so Back leaves the page). */
export function useParam(name: string): [string | null, (value: string | null) => void] {
  const [params, setParams] = useSearchParams()
  const set = (value: string | null) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value === null) next.delete(name)
        else next.set(name, value)
        return next
      },
      { replace: true },
    )
  return [params.get(name), set]
}

/** ?year=2025 if it's one of the offered years, else the first (this year). */
export function pickYear(raw: string | null, years: readonly number[]): number {
  const n = Number(raw)
  return years.includes(n) ? n : (years[0] ?? new Date().getFullYear())
}

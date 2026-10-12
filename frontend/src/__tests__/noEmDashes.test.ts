/**
 * The site's copy uses commas, colons and full stops rather than em dashes.
 * This scans every source file, with comments removed, so a new one fails
 * here instead of reaching the page.
 */
import { describe, expect, it } from 'vitest'

const sources = import.meta.glob<string>(
  ['../**/*.ts', '../**/*.tsx', '!../**/__tests__/**', '!../**/*.selftest.ts', '!../lib/methodologyFixture.ts'],
  { query: '?raw', import: 'default', eager: true },
)

function withoutComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((line) => line.replace(/(^|[^:'"`])\/\/.*$/, '$1'))
    .join('\n')
}

describe('copy style', () => {
  it('has no em dashes in anything the site shows', () => {
    const paths = Object.keys(sources)
    expect(paths.length).toBeGreaterThan(50)
    const offenders = paths.filter((path) => withoutComments(sources[path]).includes('—'))
    expect(offenders).toEqual([])
  })
})

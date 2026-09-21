import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { fixtureDir, fixtures } from './bridge.fixtures'

it('the golden packets the Rust bridge is tested against are what bridge.ts builds today', () => {
  for (const [name, bytes] of Object.entries(fixtures())) {
    expect(readFileSync(new URL(name, fixtureDir)).equals(bytes), `${name} is stale: run node bridge.fixtures.ts`).toBe(true)
  }
})

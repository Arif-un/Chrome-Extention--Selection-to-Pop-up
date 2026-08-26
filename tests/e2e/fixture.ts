import { test as base, chromium, type BrowserContext } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../dist')

/** Loads the built extension into a persistent Chromium context. */
export const test = base.extend<{ context: BrowserContext }>({
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium', // new headless supports MV3 extensions
      args: [`--disable-extensions-except=${dist}`, `--load-extension=${dist}`],
    })
    await use(context)
    await context.close()
  },
})

export const expect = test.expect

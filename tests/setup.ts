import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach } from 'vitest'

document.documentElement.dataset.testSetup = 'true'

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  }),
})

enableAutoUnmount(afterEach)

afterEach(() => {
  document.body.innerHTML = ''
})

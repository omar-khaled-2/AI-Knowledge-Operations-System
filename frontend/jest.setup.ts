import "@testing-library/jest-dom"

// Mock fetch globally for API tests
global.fetch = jest.fn()

// Provide Response for Next.js server code in tests
if (typeof Response === "undefined") {
  global.Response = class Response {
    constructor(public body?: BodyInit | null, public init?: ResponseInit) {}
    get ok() { return (this.init?.status || 200) >= 200 && (this.init?.status || 200) < 300 }
    get status() { return this.init?.status || 200 }
    get statusText() { return this.init?.statusText || "OK" }
    async json() { return JSON.parse(this.body as string || "{}") }
    async text() { return String(this.body || "") }
    get headers() { return new Headers(this.init?.headers) }
  } as any
}

// Mock better-auth/react
jest.mock("better-auth/react", () => ({
  createAuthClient: jest.fn(() => ({
    signIn: jest.fn(),
    signOut: jest.fn(),
    useSession: jest.fn(),
  })),
}))

// Provide URL if needed
global.URL = global.URL || require("url").URL

// Mock console methods to reduce noise in tests, but allow errors
const originalConsoleError = console.error
const originalConsoleWarn = console.warn

beforeAll(() => {
  console.error = (...args: any[]) => {
    // Filter out expected React/act warnings
    if (
      typeof args[0] === "string" &&
      args[0].includes("Warning: ReactDOM.render is no longer supported")
    ) {
      return
    }
    originalConsoleError.call(console, ...args)
  }

  console.warn = (...args: any[]) => {
    // Filter out expected warnings
    if (
      typeof args[0] === "string" &&
      (args[0].includes("act(...)") || args[0].includes("Warning:"))
    ) {
      return
    }
    originalConsoleWarn.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalConsoleError
  console.warn = originalConsoleWarn
})

// Clean up mocks after each test
afterEach(() => {
  jest.clearAllMocks()
})

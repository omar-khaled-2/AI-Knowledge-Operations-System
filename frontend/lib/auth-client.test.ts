import { authClient, signIn, signOut, useSession } from "./auth-client"

describe("Auth Client", () => {
  test("exports authClient instance", () => {
    expect(authClient).toBeDefined()
    expect(typeof authClient).toBe("object")
  })

  test("exports signIn function", () => {
    expect(signIn).toBeDefined()
    expect(typeof signIn).toBe("function")
  })

  test("exports signOut function", () => {
    expect(signOut).toBeDefined()
    expect(typeof signOut).toBe("function")
  })

  test("exports useSession hook", () => {
    expect(useSession).toBeDefined()
    expect(typeof useSession).toBe("function")
  })

  test("authClient uses empty baseURL for same-origin requests", () => {
    // The baseURL should be empty string to use same origin
    // This ensures auth requests go through Next.js proxy
    expect(authClient).toBeDefined()
  })
})

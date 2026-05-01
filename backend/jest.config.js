module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/main.ts',
    '!src/**/*.module.ts',
    '!src/config/**/*.ts',
    '!src/**/*.schema.ts',
    '!src/**/dto/*.ts',
    '!src/**/decorators/*.ts',
  ],
  coverageDirectory: './coverage',
  coverageReporters: ['text', 'text-summary', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  testEnvironment: 'node',
  transformIgnorePatterns: [
    '/node_modules/(?!better-auth)/',
  ],
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
    '^better-auth$': '<rootDir>/test/mocks/better-auth.mock.ts',
    '^better-auth/adapters/mongodb$': '<rootDir>/test/mocks/better-auth-mongodb.mock.ts',
  },
};

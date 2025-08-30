module.exports = {
  // The test environment that will be used for testing
  testEnvironment: 'node',

  // The glob patterns Jest uses to detect test files
  testMatch: [
    '**/tests/**/*.test.js',
    '**/?(*.)+(spec|test).js'
  ],

  // Setup files to run before tests
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // Test timeout in milliseconds
  testTimeout: 30000,

  // Coverage settings (disabled for functional testing phase)
  collectCoverage: false,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],

  // Files to ignore in coverage
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/tests/',
    '/coverage/',
    'server.js'
  ],

  // Run tests sequentially to avoid database conflicts
  maxWorkers: 1,

  // Clear mocks between tests
  clearMocks: true,
  
  // Verbose output
  verbose: true,

  // Force exit to prevent hanging
  forceExit: true
};

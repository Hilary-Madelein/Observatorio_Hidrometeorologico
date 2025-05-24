module.exports = {
    rootDir: '.',
    testEnvironment: 'node',
    testMatch: ['**/__tests__/unit/**/*.spec.[jt]s?(x)'],
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    collectCoverage: true,
    coverageDirectory: 'coverage',
  };
  
import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { 
      useESM: true,
      tsconfig: 'tsconfig.test.json'
    }],
  },
  extensionsToTreatAsEsm: ['.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
  setupFilesAfterEnv: ['<rootDir>/test/jest.setup.ts'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/tests/**/*.test.ts', '**/?(*.)+(spec|test).ts'],
  moduleNameMapper: {
    '^(\.\.?/.*)\\.js$': '$1',
    '^\.\.{1,2}/db/connection$': '<rootDir>/test/__mocks__/db/connection.ts',
    '^\.\.{1,2}/jobs/llmQueue$': '<rootDir>/test/__mocks__/jobs/llmQueue.ts',
  },
  // Stabiliza consumo de memória em ambientes CI/containers
  maxWorkers: 1,
  // Se algum handle ficar aberto, encerra ao fim do run
  forceExit: true,
  // Timeout global um pouco maior para CI
  testTimeout: 45000,
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/migrations/**',
    '!src/**/types/**',
    '!src/**/*.d.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
};

export default config;

export default {
  displayName: "frontend",
  testEnvironment: "jest-environment-jsdom",
  transform: {
    "^.+\\.[jt]sx?$": "babel-jest",
  },
  moduleNameMapper: {
    "\\.(css|scss)$": "identity-obj-proxy",
  },
  transformIgnorePatterns: [
    "node_modules", // 👈 Allow axios to be transformed
  ],
  testMatch: ["<rootDir>/client/src/**/*.test.[jt]s?(x)"],
  // testMatch: ["<rootDir>/client/src/pages/**/*.test.js"], // 👈 Expand beyond Auth
  testPathIgnorePatterns: ["<rootDir>/client/src/_site/"],
  collectCoverage: true,
  collectCoverageFrom: ["client/src/pages/**/*.{js,jsx}"],
  coverageThreshold: {
    global: {
      lines: 100,
      functions: 100,
    },
  },
  setupFilesAfterEnv: ["<rootDir>/client/src/setupTests.js"],
};

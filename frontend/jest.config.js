/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/src/setupTests.ts"],
  moduleNameMapper: {
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
    "^@mui/icons-material$": "<rootDir>/src/__mocks__/@mui/icons-material",
    "^@mui/icons-material/(.*)$": "<rootDir>/src/__mocks__/@mui/icons-material",
    "^@mui/material$": "<rootDir>/src/__mocks__/@mui/material",
    "^@mui/material/(.*)$": "<rootDir>/src/__mocks__/@mui/material"
  },
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        tsconfig: "<rootDir>/tsconfig.test.json",
        jsx: "react-jsx",
        isolatedModules: true
      },
    ],
  },
  transformIgnorePatterns: [
    "/node_modules/(?!(@mui|@blockly)/)"
  ],
  moduleDirectories: ["node_modules", "src"],
  testMatch: [
    "<rootDir>/src/**/*.{spec,test}.{js,jsx,ts,tsx}",
    "<rootDir>/src/**/__tests__/**/*.test.{js,jsx,ts,tsx}",
  ],
  testPathIgnorePatterns: ["/node_modules/", "/__mocks__/", "/setup\\.ts$"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  testEnvironmentOptions: {
    customExportConditions: [""],
  }
};

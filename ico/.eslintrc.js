module.exports = {
  env: {
    browser: false,
    es2021: true,
    mocha: true,
    node: true,
  },
  plugins: ["@typescript-eslint"],
  extends: [
    "standard",
    "plugin:prettier/recommended",
    "plugin:node/recommended",
  ],
  parser: "@typescript-eslint/parser",
  ignorePatterns: [".eslintrc.js"],
  parserOptions: {
    ecmaVersion: 12,
    tsConfigRootDir: __dirname,
    project: "./tsconfig.json",
    sourceType: "module",
  },
  rules: {
    "node/no-unpublished-import": "off",
    "node/no-unsupported-features/es-syntax": [
      "error",
      { ignores: ["modules"] },
    ],
    "@typescript-eslint/no-floating-promises": ["error"],
    "no-unused-expressions": "off",
    camelcase: "off",
  },
};

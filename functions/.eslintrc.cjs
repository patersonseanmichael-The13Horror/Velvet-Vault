module.exports = {
  root: true,
  env: {
    es2022: true,
    jest: true,
    node: true
  },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    sourceType: "module"
  },
  plugins: ["@typescript-eslint"],
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  ignorePatterns: ["lib/**", "node_modules/**"]
};

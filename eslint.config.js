import globals from "globals";
export default [
  { ignores: ["assets/**", "old/**", "node_modules/**"] },
  {
    files: ["app.js", "src/**/*.js", "scripts/**/*.mjs", "tests/**/*.mjs"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.browser, ...globals.node },
    },
    rules: { "no-undef": "error" },
  },
];

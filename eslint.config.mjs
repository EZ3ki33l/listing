import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

export default [
  ...coreWebVitals,
  ...typescript,
  { ignores: [".next/**", "src/prisma/contract.d.ts"] },
  // shortcut: règle ajoutée par eslint-config-next 16, le code existant charge ses données dans des effets ; à corriger composant par composant
  { rules: { "react-hooks/set-state-in-effect": "warn" } },
];

// Flat config for ESLint 9 + eslint-config-next 16 (Next 16 removed the `next lint` command).
import next from "eslint-config-next/core-web-vitals";

const config = [
  { ignores: [".next/**", "node_modules/**", "public/**", "next-env.d.ts", "scripts/**"] },
  ...next,
  {
    rules: {
      // Keep <img> allowed (product images come from Open Food Facts at arbitrary hosts).
      "@next/next/no-img-element": "off",
      // The React-Compiler lint rules that eslint-config-next 16 enables are advisory and
      // assume React Compiler semantics we don't opt into. Keep them as warnings, not errors.
      "react-hooks/refs": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/use-memo": "warn"
    }
  }
];

export default config;

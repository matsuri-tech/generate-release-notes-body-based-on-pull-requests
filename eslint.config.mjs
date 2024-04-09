import pluginJs from "@eslint/js";
export default [
  {
    ignores: ["node_modules", "dist"],
  },
  pluginJs.configs.recommended,
];

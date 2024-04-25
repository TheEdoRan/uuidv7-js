// @ts-check

import eslint from "@eslint/js";
import prettierConfig from "eslint-config-prettier";
import tseslint from "typescript-eslint";

export default tseslint.config(
	{
		ignores: ["**/*.js", "**/*.mjs", "**/*.cjs", "dist/**"],
	},
	eslint.configs.recommended,
	...tseslint.configs.recommendedTypeChecked,
	{
		languageOptions: {
			parserOptions: {
				project: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
	},
	{
		rules: {
			"@typescript-eslint/consistent-type-imports": "error",
			"@typescript-eslint/consistent-type-exports": "error",
		},
	},
	prettierConfig
);

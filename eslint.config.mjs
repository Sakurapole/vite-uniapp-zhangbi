import { createRequire } from 'node:module'
// eslint.config.mjs
import antfu from '@antfu/eslint-config'
import globals from 'globals'

const require = createRequire(import.meta.url)
const autoImportGlobals = require('./.eslintrc-auto-import.json').globals

export default antfu(
  {
    unocss: true,
    formatters: {
      css: true,
      html: true,
      markdown: 'prettier',
    },
    ignores: ['**/uni_modules'],
    // 你可以在这里设置 stylistic 规则，但如果被覆盖，就需要在下面的 rules 中重新设置
    stylistic: {
      rules: {
        // 这个设置可能会被默认配置覆盖
        '@stylistic/indent': ['error', 2],
        '@stylistic/padding-line-between-statements': [
          'error',
          { blankline: 'always', prev: ['let', 'const', 'var'], next: ['let', 'const', 'var'] },
        ],
      },
    },
  },
  {
    languageOptions: {
      globals: {
        uni: 'readonly',
        ...globals.browser,
        ...globals.node,
        ...autoImportGlobals,
      },
    },
    rules: {
      '@stylistic/indent': ['error', 2],

      'vue/html-indent': ['error', 2],

      // 解决 @apply 报错
      'css/unknown-at-rule': 'off',

      // 其他规则...
      'node/prefer-global/process': 'off',
      '@typescript-eslint/func-style': 'off',
      'unused-imports/no-unused-vars': 'off',
      'no-console': 'off',
      'vue/no-unused-vars': 'off',
      'vue/html-self-closing': 'off',
    },
  },
)

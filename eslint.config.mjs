import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'

/**
 * eslint-config-next ≥16 экспортирует нативные flat-конфиги (массивы).
 * НЕ прогонять их через FlatCompat: legacy-валидатор @eslint/eslintrc падает
 * на них с «Converting circular structure to JSON» (плагин-объекты циклические).
 */
const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-empty-object-type': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          args: 'after-used',
          ignoreRestSiblings: false,
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^(_|ignore)',
        },
      ],
    },
  },
  {
    // Политика флаки (QA-12) — запреты в коде, не только в доках:
    // sleep-ожидания в тестах флачат; ждать надо web-first assertions.
    files: ['tests/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.property.name='waitForTimeout']",
          message:
            'Sleep-ожидания запрещены (QA-12): используйте web-first assertions (expect(...).toBeVisible() и т.п.).',
        },
      ],
    },
  },
  {
    ignores: ['.next/', 'src/payload-types.ts', 'src/payload-generated-schema.ts'],
  },
]

export default eslintConfig

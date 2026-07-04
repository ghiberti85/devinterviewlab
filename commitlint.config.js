// Conventional Commits, mensagens em português — ver seção "Padrão de commit" no CLAUDE.md.
// Adiciona o tipo "security" (usado no projeto para correções de segurança) ao conjunto padrão.
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'build',
        'ci',
        'chore',
        'revert',
        'security',
      ],
    ],
    'subject-case': [0],
  },
}

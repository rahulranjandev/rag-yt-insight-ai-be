module.exports = {
  meta: {
    name: 'eslint-plugin-custom-rules',
    version: '1.2.3',
  },
  rules: {
    'enforce-foo-bar': require('./rules/enforce-foo-bar'),
    'typeorm/no-column-name': require('./rules/typeorm-column-name-rule'),
    'typeorm/no-join-column-name': require('./rules/typeorm-disallow-name-property'),
  },
};

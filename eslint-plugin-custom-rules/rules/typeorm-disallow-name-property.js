module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow the use of the "name" property in @JoinColumn, @CreateDateColumn, and @UpdateDateColumn decorators.',
      category: 'Best Practices',
      recommended: false,
    },
    schema: [], // No options for this rule
    messages: {
      disallowedName:
        'The "name" property is not allowed in the "{{decorator}}" decorator.',
    },
  },
  create(context) {
    const disallowedDecorators = [
      'JoinColumn',
      'CreateDateColumn',
      'UpdateDateColumn',
    ];

    return {
      CallExpression(node) {
        if (
          node.callee.type === 'Identifier' &&
          disallowedDecorators.includes(node.callee.name)
        ) {
          const args = node.arguments;
          if (args.length && args[0].type === 'ObjectExpression') {
            const nameProperty = args[0].properties.find(
              (prop) =>
                prop.key.type === 'Identifier' && prop.key.name === 'name',
            );

            if (nameProperty) {
              context.report({
                node: nameProperty.key,
                messageId: 'disallowedName',
                data: { decorator: node.callee.name },
              });
            }
          }
        }
      },
    };
  },
};

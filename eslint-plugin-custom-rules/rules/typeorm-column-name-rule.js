module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow the use of the `name` property in TypeORM @Column decorator',
      category: 'Best Practices',
      recommended: false,
    },
    messages: {
      avoidColumnName:
        "Avoid using the 'name' property in @Column. Use a naming convention instead.",
    },
    schema: [], // No options
  },
  create(context) {
    return {
      CallExpression(node) {
        const isColumnDecorator =
          node.callee.type === 'Identifier' && node.callee.name === 'Column';

        if (isColumnDecorator && node.arguments.length > 0) {
          const columnOptions = node.arguments[0];

          if (
            columnOptions.type === 'ObjectExpression' &&
            columnOptions.properties.some(
              (prop) =>
                prop.key.name === 'name' && prop.value.type === 'Literal',
            )
          ) {
            context.report({
              node: columnOptions,
              messageId: 'avoidColumnName',
            });
          }
        }
      },
    };
  },
};

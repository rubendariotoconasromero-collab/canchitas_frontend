import {readdirSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import ts from 'typescript';
import {parseTemplate} from '@angular/compiler';

const validName = /^[a-z][a-z0-9_]*$/;

export function iconsInSource(source, filename = 'component.ts') {
  const icons = new Set();
  const add = value => {if (typeof value === 'string' && validName.test(value)) icons.add(value);};
  function angularValues(ast) {
    if (!ast) return;
    if (ast.constructor.name === 'LiteralPrimitive') add(ast.value);
    else if (ast.constructor.name === 'Interpolation') ast.expressions.forEach(angularValues);
    else if (ast.constructor.name === 'Conditional') {angularValues(ast.trueExp); angularValues(ast.falseExp);}
    else if (ast.constructor.name === 'Binary' && ['||', '??'].includes(ast.operation)) {
      angularValues(ast.left); angularValues(ast.right);
    } else if (ast.ast) angularValues(ast.ast);
  }
  function template(value) {
    const parsed = parseTemplate(value, filename);
    if (parsed.errors?.length) throw new Error(parsed.errors.map(error => error.toString()).join('\n'));
    const visited = new WeakSet();
    function walk(node) {
      if (!node || typeof node !== 'object' || visited.has(node)) return;
      visited.add(node);
      if (Array.isArray(node.attributes)) {
        for (const attribute of node.attributes) if (/icon$/i.test(attribute.name)) add(attribute.value);
        for (const binding of node.inputs || []) if (/icon$/i.test(binding.name)) angularValues(binding.value);
        if (node.attributes.some(attribute => attribute.name === 'class' && attribute.value.split(/\s+/).includes('material-symbols-outlined'))) {
          for (const child of node.children || []) {
            if (typeof child.value === 'string') add(child.value.trim());
            else angularValues(child.value);
          }
        }
      }
      for (const child of Object.values(node)) if (typeof child === 'object') {
        if (Array.isArray(child)) child.forEach(walk); else walk(child);
      }
    }
    parsed.nodes.forEach(walk);
  }
  function tsValues(node) {
    if (!node) return;
    if (ts.isStringLiteralLike(node)) add(node.text);
    else if (ts.isConditionalExpression(node)) {tsValues(node.whenTrue); tsValues(node.whenFalse);}
    else if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node)) tsValues(node.expression);
    else if (ts.isBinaryExpression(node) && [ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken].includes(node.operatorToken.kind)) {
      tsValues(node.left); tsValues(node.right);
    } else if (ts.isCallExpression(node) && /^(input|signal)$/.test(node.expression.getText())) tsValues(node.arguments[0]);
    else if (ts.isObjectLiteralExpression(node)) node.properties.forEach(property => tsValues(property.initializer));
  }
  if (filename.endsWith('.html')) template(source);
  else {
    const tree = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true);
    function visit(node) {
      if (ts.isPropertyAssignment(node) || ts.isPropertyDeclaration(node) || ts.isVariableDeclaration(node)) {
        const name = node.name?.getText(tree).replace(/^['"]|['"]$/g, '');
        if (/icons?$/i.test(name || '')) tsValues(node.initializer);
        if (name === 'template' && node.initializer && ts.isStringLiteralLike(node.initializer)) template(node.initializer.text);
      }
      ts.forEachChild(node, visit);
    }
    visit(tree);
  }
  return [...icons].sort();
}

export function iconInventory(root) {
  const icons = new Set();
  function scan(directory) {
    for (const entry of readdirSync(directory, {withFileTypes: true})) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) scan(path);
      else if (/\.(ts|html)$/.test(entry.name) && !entry.name.endsWith('.spec.ts')) {
        iconsInSource(readFileSync(path, 'utf8'), path).forEach(icon => icons.add(icon));
      }
    }
  }
  scan(root);
  return [...icons].sort();
}

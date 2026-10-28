import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';

const contract = JSON.parse(readFileSync(resolve(__dirname, '../../docs/activity-cms.openapi.json'), 'utf8'));

test('OpenAPI references resolve, implementation status is explicit and writes require appropriate protection', () => {
  assert.equal(contract.openapi, '3.1.0');
  const ids = new Set();
  function walk(value: unknown) {
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      if (key === '$ref') {
        assert.equal(typeof child, 'string');
        assert.ok((child as string).startsWith('#/'));
        const target = (child as string).slice(2).split('/').reduce((current, part) => current?.[part.replaceAll('~1', '/').replaceAll('~0', '~')], contract);
        assert.ok(target, `Unresolved OpenAPI reference: ${child}`);
      } else walk(child);
    }
  }
  walk(contract);
  for (const [path, methods] of Object.entries(contract.paths) as [string, Record<string, any>][]) {
    for (const [method, operation] of Object.entries(methods)) {
      assert.ok(['planned', 'implemented'].includes(operation['x-implementation-status']));
      assert.ok(!ids.has(operation.operationId));
      ids.add(operation.operationId);
      assert.ok(operation.responses['200'] || operation.responses['201'] || operation.responses['302']);
      if (operation.security.length) assert.deepEqual(operation.security, [{ session: [] }]);
      if (!path.includes('/admin/')) continue;
      assert.deepEqual(operation.security, [{ session: [] }]);
      if (method === 'get') continue;
      assert.ok(operation.parameters.some((p: any) => p.name === 'X-CSRF-Token' && p.required));
      if (/\/(activities|activity-categories|users)\/\{/.test(path)) {
        const name = operation.requestBody.content['application/json'].schema.$ref.split('/').at(-1);
        assert.ok(contract.components.schemas[name].required.includes('version'));
      }
      for (const code of ['400', '401', '403', '404', '409']) assert.ok(operation.responses[code]);
    }
  }
  assert.deepEqual(contract.components.schemas.Revision.properties.status.enum, ['DRAFT', 'SUBMITTED', 'PUBLISHED']);
  assert.ok(!('status' in contract.components.schemas.ActivityContent.properties));
  assert.ok(!('id' in contract.components.schemas.ActivityContent.properties));
  assert.equal(contract.paths['/api/v1/public/activity-content'].get['x-implementation-status'], 'implemented');
  assert.equal(contract.paths['/api/v1/admin/users'].post['x-implementation-status'], 'planned');
  assert.equal(contract.paths['/api/v1/admin/media'].post['x-implementation-status'], 'planned');
});

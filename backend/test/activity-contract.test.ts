import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';

const contract = JSON.parse(readFileSync(resolve(__dirname, '../../docs/activity-cms.openapi.json'), 'utf8'));

test('planned OpenAPI references resolve and every admin write requires session, CSRF and version', () => {
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
      assert.equal(operation['x-implementation-status'], 'planned');
      assert.ok(!ids.has(operation.operationId));
      ids.add(operation.operationId);
      assert.ok(operation.responses['200'] || operation.responses['201']);
      if (!path.includes('/admin/')) { assert.deepEqual(operation.security, []); continue; }
      assert.deepEqual(operation.security, [{ session: [] }]);
      if (method === 'get') continue;
      assert.ok(operation.parameters.some((p: any) => p.name === 'X-CSRF-Token' && p.required));
      const name = operation.requestBody.content['application/json'].schema.$ref.split('/').at(-1);
      const schema = contract.components.schemas[name];
      if (path.includes('{id}')) assert.ok(schema.required.includes('version'));
      for (const code of ['400', '401', '403', '404', '409']) assert.ok(operation.responses[code]);
    }
  }
  assert.deepEqual(contract.components.schemas.Revision.properties.status.enum, ['DRAFT', 'SUBMITTED', 'PUBLISHED']);
  assert.ok(!('status' in contract.components.schemas.ActivityContent.properties));
  assert.ok(!('id' in contract.components.schemas.ActivityContent.properties));
});

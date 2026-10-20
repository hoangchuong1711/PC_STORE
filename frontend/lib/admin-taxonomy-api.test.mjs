import test from 'node:test';
import assert from 'node:assert/strict';
import { createAdminTaxonomyApi } from './admin-taxonomy-api.ts';

const row = { id: 12, name: 'CPU', description: null, status: 'ACTIVE', componentType: 'CPU', logoUrl: null, productCount: 2 };
const json = (value, status = 200) => new Response(JSON.stringify(value), { status });

test('lists inactive entries using admin endpoints and disables caching', async () => {
  const calls = [];
  const api = createAdminTaxonomyApi(async (url, options) => {
    calls.push([url, options.method, options.credentials, options.cache]);
    return json([{ ...row, status: 'INACTIVE' }]);
  });
  assert.equal((await api.list('categories'))[0].status, 'INACTIVE');
  await api.list('brands');
  assert.deepEqual(calls, [
    ['/api/admin/categories', 'GET', 'same-origin', 'no-store'],
    ['/api/admin/brands', 'GET', 'same-origin', 'no-store'],
  ]);
});

test('saves only schema fields and uses backend IDs for updates/status changes', async () => {
  const calls = [];
  const api = createAdminTaxonomyApi(async (url, options) => {
    calls.push([url, options.method, JSON.parse(options.body)]);
    return json(row);
  });
  const input = { name: 'CPU', description: '', status: 'ACTIVE', componentType: 'CPU', logoUrl: 'https://example.test/a', slug: 'cpu' };
  assert.equal((await api.save('categories', null, input)).id, 12);
  await api.save('brands', 12, input);
  await api.setStatus('categories', 12, 'INACTIVE');
  assert.deepEqual(calls, [
    ['/api/admin/categories', 'POST', { name: 'CPU', description: '', status: 'ACTIVE', componentType: 'CPU' }],
    ['/api/admin/brands/12', 'PUT', { name: 'CPU', description: '', status: 'ACTIVE', logoUrl: 'https://example.test/a' }],
    ['/api/admin/categories/12/status', 'PUT', { status: 'INACTIVE' }],
  ]);
});

test('rejects malformed data and preserves server errors', async () => {
  for (const value of [null, {}, [{ ...row, id: -1 }], [{ ...row, status: 'HIDDEN' }], [{ ...row, productCount: '2' }]]) {
    await assert.rejects(createAdminTaxonomyApi(async () => json(value)).list('categories'), e => e.code === 'INVALID_RESPONSE');
  }
  await assert.rejects(createAdminTaxonomyApi(async () => json({ code: 'FORBIDDEN', message: 'Không có quyền' }, 403)).list('brands'),
    e => e.status === 403 && e.code === 'FORBIDDEN');
  await assert.rejects(createAdminTaxonomyApi(async () => { throw new Error('offline'); }).list('brands'), e => e.code === 'NETWORK_ERROR');
});

'use strict'

const test = require('brittle')
const { testModuleStructure, testHandlerFunctions, testPreHandlerFunctions } = require('../helpers/routeTestHelpers')
const { createRoutesForTest } = require('../helpers/mockHelpers')

test('global routes - module structure', (t) => {
  testModuleStructure(t, '../../../workers/lib/server/routes/global.routes.js', 'global')
  t.pass()
})

test('global routes - route definitions', (t) => {
  const routes = createRoutesForTest('../../../workers/lib/server/routes/global.routes.js')

  // Test that we have the expected routes
  const routeUrls = routes.map(route => route.url)
  t.ok(routeUrls.includes('/auth/global/data'), 'should have global data GET route')
  t.ok(routeUrls.includes('/auth/global/data'), 'should have global data POST route')
  t.ok(routeUrls.includes('/auth/featureConfig'), 'should have feature config route')
  t.ok(routeUrls.includes('/auth/features'), 'should have features GET route')
  t.ok(routeUrls.includes('/auth/features'), 'should have features POST route')
  t.ok(routeUrls.includes('/auth/global-config'), 'should have global config GET route')
  t.ok(routeUrls.includes('/auth/global-config'), 'should have global config POST route')
  t.ok(routeUrls.includes('/auth/site'), 'should have site config route')

  t.pass()
})

test('global routes - featureConfig is read-only and features returns the same response', async (t) => {
  const routes = require('../../../workers/lib/server/routes/global.routes.js')({
    globalDataLib: { getGlobalData: async () => ({ inventory: true, flagOnly: true }) },
    conf: { featureConfig: { inventory: false } }
  })
  const find = (method, url) => routes.find(r => r.method === method && r.url === url)
  const get = async (url) => {
    let body
    await find('GET', url).handler({}, { status: () => ({ send: (data) => { body = data } }) })
    return body
  }

  t.absent(find('POST', '/auth/featureConfig'), 'featureConfig has no POST route')
  t.ok(find('POST', '/auth/features'), 'features keeps its POST route')
  t.alike(await get('/auth/features'), await get('/auth/featureConfig'))
})

test('global routes - schema integration', (t) => {
  const routes = createRoutesForTest('../../../workers/lib/server/routes/global.routes.js')

  // Test that routes with schemas have the expected structure
  const routesWithSchemas = routes.filter(route => route.schema)

  routesWithSchemas.forEach(route => {
    t.ok(route.schema, `route ${route.url} should have schema`)

    if (route.schema.querystring) {
      t.ok(typeof route.schema.querystring === 'object', `route ${route.url} querystring should be object`)
    }

    if (route.schema.body) {
      t.ok(typeof route.schema.body === 'object', `route ${route.url} body should be object`)
    }
  })

  t.pass()
})

test('global routes - handler functions', (t) => {
  const routes = createRoutesForTest('../../../workers/lib/server/routes/global.routes.js')
  testHandlerFunctions(t, routes, 'global')
  t.pass()
})

test('global routes - preHandler functions', (t) => {
  const routes = createRoutesForTest('../../../workers/lib/server/routes/global.routes.js')
  testPreHandlerFunctions(t, routes, 'global')
  t.pass()
})

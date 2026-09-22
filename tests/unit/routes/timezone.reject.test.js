'use strict'

const test = require('brittle')
const { createRoutesForTest } = require('../helpers/mockHelpers')
const { rejectTimezone } = require('../../../workers/lib/server/lib/routeHelpers')

const runPreValidation = (route, query) => {
  let result
  route.preValidation({ query }, {}, (err) => { result = err || null })
  return result
}

test('rejectTimezone - rejects a sent timezone unless the predicate allows it', (t) => {
  const route = { preValidation: rejectTimezone() }
  t.is(runPreValidation(route, { timezone: 'UTC' })?.message, 'ERR_TIMEZONE_UNSUPPORTED')
  t.is(runPreValidation(route, { timezone: '' })?.message, 'ERR_TIMEZONE_UNSUPPORTED', 'an empty value is still sent')
  t.is(runPreValidation(route, {}), null)

  const allowed = { preValidation: rejectTimezone((req) => req.query.interval === '1M') }
  t.is(runPreValidation(allowed, { interval: '1M', timezone: 'UTC' }), null)
  t.is(runPreValidation(allowed, { interval: '1d', timezone: 'UTC' })?.message, 'ERR_TIMEZONE_UNSUPPORTED')
})

// start/end routes that never used the zone used to take it silently (unknown params are
// ignored, or stripped under additionalProperties: false), so a caller could not tell.
const ROUTES = [
  ['../../../workers/lib/server/routes/alerts.routes.js', '/auth/alerts/history'],
  ['../../../workers/lib/server/routes/energy.routes.js', '/auth/energy/forecast/history'],
  ['../../../workers/lib/server/routes/logs.routes.js', '/auth/tail-log'],
  ['../../../workers/lib/server/routes/logs.routes.js', '/auth/tail-log/multi'],
  ['../../../workers/lib/server/routes/logs.routes.js', '/auth/history-log'],
  ['../../../workers/lib/server/routes/work.orders.routes.js', '/auth/work-orders/:id/audit'],
  ['../../../workers/lib/server/routes/power.consumption.routes.js', '/auth/site/power-consumption']
]

test('start/end routes that do not use timezone reject it', (t) => {
  for (const [path, url] of ROUTES) {
    const route = createRoutesForTest(path).find(r => r.url === url && r.method === 'GET')
    t.ok(route, `${url} exists`)
    t.is(runPreValidation(route, { timezone: 'UTC' })?.message, 'ERR_TIMEZONE_UNSUPPORTED', `${url} rejects timezone`)
    t.is(runPreValidation(route, {}), null, `${url} passes without it`)
  }
})

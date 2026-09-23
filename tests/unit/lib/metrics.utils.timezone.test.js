'use strict'

const test = require('brittle')
const { LOCKED_TIMEZONE_DEFAULT } = require('../../../workers/lib/constants')
const {
  assertTimezone,
  resolveTimezone,
  resolveStartEnd,
  resolveOptionalTimeMs,
  localMonthKey
} = require('../../../workers/lib/metrics.utils')

// ==================== assertTimezone ====================

test('assertTimezone - passes through a valid IANA zone', (t) => {
  t.is(assertTimezone('America/Campo_Grande'), 'America/Campo_Grande')
  t.pass()
})

test('assertTimezone - rejects an invalid zone', (t) => {
  try {
    assertTimezone('Not/A_Zone')
    t.fail('should have thrown')
  } catch (err) {
    t.is(err.message, 'ERR_INVALID_TIMEZONE')
  }
  t.pass()
})

// ==================== resolveTimezone ====================

test('resolveTimezone - uses the request timezone when present', (t) => {
  const ctx = { conf: {} }
  const req = { query: { timezone: 'Asia/Kolkata' } }
  t.is(resolveTimezone(ctx, req), 'Asia/Kolkata')
  t.pass()
})

test('resolveTimezone - falls back to common.json lockedTimezone', (t) => {
  const ctx = { conf: { featureConfig: { lockedTimezone: 'America/Campo_Grande' } } }
  const req = { query: {} }
  t.is(resolveTimezone(ctx, req), 'America/Campo_Grande')
  t.pass()
})

test('resolveTimezone - falls back to the constants default when unset anywhere', (t) => {
  const ctx = { conf: {} }
  const req = { query: {} }
  t.is(resolveTimezone(ctx, req), LOCKED_TIMEZONE_DEFAULT)
  t.pass()
})

test('resolveTimezone - rejects an invalid IANA timezone', (t) => {
  const ctx = { conf: {} }
  const req = { query: { timezone: 'Not/A_Zone' } }
  try {
    resolveTimezone(ctx, req)
    t.fail('should have thrown')
  } catch (err) {
    t.is(err.message, 'ERR_INVALID_TIMEZONE')
  }
  t.pass()
})

// ==================== resolveStartEnd ====================

test('resolveStartEnd - never reinterprets start/end, even with an explicit request timezone', (t) => {
  const ctx = { conf: {} }
  const start = Date.UTC(2026, 5, 1, 0, 0, 0)
  const end = Date.UTC(2026, 5, 2, 0, 0, 0)
  const req = { query: { start, end, timezone: 'America/Campo_Grande' } }

  const result = resolveStartEnd(ctx, req)
  t.is(result.timezone, 'America/Campo_Grande')
  t.is(result.start, start, 'start is a true UTC instant, same as export')
  t.is(result.end, end, 'end is a true UTC instant, same as export')
  t.pass()
})

test('resolveStartEnd - resolves lockedTimezone for the returned zone, but never shifts start/end', (t) => {
  const ctx = { conf: { featureConfig: { lockedTimezone: 'America/Campo_Grande' } } }
  const start = Date.UTC(2026, 5, 1, 0, 0, 0)
  const end = Date.UTC(2026, 5, 2, 0, 0, 0)
  const req = { query: { start, end } }

  const result = resolveStartEnd(ctx, req)
  t.is(result.timezone, 'America/Campo_Grande', 'timezone still resolves via lockedTimezone')
  t.is(result.start, start, 'start left untouched - no explicit request timezone to opt in with')
  t.is(result.end, end, 'end left untouched')
  t.pass()
})

test('resolveStartEnd - still validates start/end', (t) => {
  const ctx = { conf: {} }
  const req = { query: { start: 1700100000000, end: 1700000000000 } }
  try {
    resolveStartEnd(ctx, req)
    t.fail('should have thrown')
  } catch (err) {
    t.is(err.message, 'ERR_INVALID_DATE_RANGE')
  }
  t.pass()
})

// ==================== resolveOptionalTimeMs ====================

test('resolveOptionalTimeMs - missing value returns the default untouched', (t) => {
  const req = { query: {} }
  t.is(resolveOptionalTimeMs(req, undefined, 12345), 12345)
  t.pass()
})

test('resolveOptionalTimeMs - an explicit value is a true UTC instant, timezone or not', (t) => {
  const ts = Date.UTC(2026, 5, 1, 0, 0, 0)

  const withExplicitTz = { query: { start: ts, timezone: 'America/Campo_Grande' } }
  t.is(resolveOptionalTimeMs(withExplicitTz, ts, 0), ts)

  const withoutTz = { query: { start: ts } }
  t.is(resolveOptionalTimeMs(withoutTz, ts, 0), ts)
  t.pass()
})

test('localMonthKey - a missing timezone throws instead of using the host zone', async (t) => {
  await t.exception(() => localMonthKey(Date.UTC(2026, 0, 1)), /localMonthKey: timezone is required/)
  t.is(localMonthKey(Date.UTC(2026, 0, 1, 2), 'America/Campo_Grande'), '2025-12', 'explicit zone still works')
})

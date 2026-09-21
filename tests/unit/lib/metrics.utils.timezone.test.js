'use strict'

const test = require('brittle')
const {
  assertTimezone,
  resolveTimezone,
  convertLocalToUtcMs,
  resolveStartEnd
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

test('resolveTimezone - request timezone wins over common.json', (t) => {
  const ctx = { conf: { featureConfig: { lockedTimezone: 'America/Campo_Grande' } } }
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

test('resolveTimezone - falls back to UTC when unset anywhere', (t) => {
  const ctx = { conf: {} }
  const req = { query: {} }
  t.is(resolveTimezone(ctx, req), 'UTC')
  t.pass()
})

// ==================== convertLocalToUtcMs ====================

test('convertLocalToUtcMs - UTC is a no-op', (t) => {
  const ms = Date.UTC(2026, 5, 1, 0, 0, 0)
  t.is(convertLocalToUtcMs(ms, 'UTC'), ms)
  t.pass()
})

test('convertLocalToUtcMs - shifts wall-clock local time to the real UTC instant', (t) => {
  const localMidnight = Date.UTC(2026, 5, 1, 0, 0, 0)
  // America/Campo_Grande is UTC-4 with no DST, so local midnight is 04:00 UTC.
  t.is(convertLocalToUtcMs(localMidnight, 'America/Campo_Grande'), localMidnight + 4 * 3600000)
  t.pass()
})

// ==================== resolveStartEnd ====================

test('resolveStartEnd - converts start/end using the request timezone', (t) => {
  const ctx = { conf: {} }
  const localStart = Date.UTC(2026, 5, 1, 0, 0, 0)
  const localEnd = Date.UTC(2026, 5, 2, 0, 0, 0)
  const req = { query: { start: localStart, end: localEnd, timezone: 'America/Campo_Grande' } }

  const { start, end, timezone } = resolveStartEnd(ctx, req)
  t.is(timezone, 'America/Campo_Grande')
  t.is(start, localStart + 4 * 3600000)
  t.is(end, localEnd + 4 * 3600000)
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

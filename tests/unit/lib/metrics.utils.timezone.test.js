'use strict'

const test = require('brittle')
const { LOCKED_TIMEZONE_DEFAULT } = require('../../../workers/lib/constants')
const {
  assertTimezone,
  resolveTimezone,
  convertLocalToUtcMs,
  resolveStartEnd,
  resolveOptionalTimeMs,
  convertUtcToLocalMs,
  localizeLogTimestamps,
  withLocalizedLog
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

test('resolveStartEnd - resolves lockedTimezone for the returned zone, but never shifts start/end without an explicit request timezone', (t) => {
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
  t.is(resolveOptionalTimeMs(req, 'America/Campo_Grande', undefined, 12345), 12345)
  t.pass()
})

test('resolveOptionalTimeMs - explicit value converts only when the request timezone is explicit', (t) => {
  const localMidnight = Date.UTC(2026, 5, 1, 0, 0, 0)

  const withExplicitTz = { query: { start: localMidnight, timezone: 'America/Campo_Grande' } }
  t.is(resolveOptionalTimeMs(withExplicitTz, 'America/Campo_Grande', localMidnight, 0), localMidnight + 4 * 3600000)

  const withoutTz = { query: { start: localMidnight } }
  t.is(resolveOptionalTimeMs(withoutTz, 'America/Campo_Grande', localMidnight, 0), localMidnight, 'no request timezone, value left untouched even though a zone was resolved')
  t.pass()
})

// ==================== convertUtcToLocalMs ====================

test('convertUtcToLocalMs - UTC is a no-op', (t) => {
  const ms = Date.UTC(2026, 5, 1, 4, 0, 0)
  t.is(convertUtcToLocalMs(ms, 'UTC'), ms)
  t.pass()
})

test('convertUtcToLocalMs - is the exact reverse of convertLocalToUtcMs', (t) => {
  const localMidnight = Date.UTC(2026, 5, 1, 0, 0, 0)
  const utcInstant = convertLocalToUtcMs(localMidnight, 'America/Campo_Grande')
  t.is(convertUtcToLocalMs(utcInstant, 'America/Campo_Grande'), localMidnight)
  t.pass()
})

// ==================== localizeLogTimestamps ====================

test('localizeLogTimestamps - shifts ts and timeRange back to local wall-clock', (t) => {
  const utcTs = Date.UTC(2026, 5, 1, 4, 0, 0)
  const log = [
    { ts: utcTs, value: 1 },
    { ts: utcTs, timeRange: { startTs: utcTs, endTs: utcTs + 86400000 }, value: 2 }
  ]
  const localized = localizeLogTimestamps(log, 'America/Campo_Grande')
  t.is(localized[0].ts, Date.UTC(2026, 5, 1, 0, 0, 0), 'plain ts shifted -4h')
  t.is(localized[1].timeRange.startTs, Date.UTC(2026, 5, 1, 0, 0, 0), 'timeRange.startTs shifted')
  t.is(localized[1].timeRange.endTs, Date.UTC(2026, 5, 1, 0, 0, 0) + 86400000, 'timeRange.endTs shifted')
  t.is(log[0].ts, utcTs, 'input log left untouched')
  t.pass()
})

test('localizeLogTimestamps - UTC/missing timezone is a no-op', (t) => {
  const log = [{ ts: 1700000000000 }]
  t.is(localizeLogTimestamps(log, 'UTC'), log)
  t.is(localizeLogTimestamps(log, undefined), log)
  t.pass()
})

// ==================== withLocalizedLog ====================

test('withLocalizedLog - localizes only when the caller sent an explicit timezone', async (t) => {
  const utcTs = Date.UTC(2026, 5, 1, 4, 0, 0)
  const handler = async () => ({ log: [{ ts: utcTs }], summary: {} })
  const wrapped = withLocalizedLog(handler)
  const localized = Date.UTC(2026, 5, 1, 0, 0, 0)

  const withExplicitTz = await wrapped({ conf: {} }, { query: { timezone: 'America/Campo_Grande' } })
  t.is(withExplicitTz.log[0].ts, localized, 'explicit request timezone localizes ts')

  const withLockedTzButNoRequestTz = await wrapped(
    { conf: { featureConfig: { lockedTimezone: 'America/Campo_Grande' } } },
    { query: {} }
  )
  t.is(withLockedTzButNoRequestTz.log[0].ts, utcTs, 'lockedTimezone resolves but does not trigger localization on its own')

  const withoutAnyTz = await wrapped({ conf: {} }, { query: {} })
  t.is(withoutAnyTz.log[0].ts, utcTs, 'no request timezone at all leaves ts as true UTC')
  t.pass()
})

test('withLocalizedLog - passes through non-log results untouched', async (t) => {
  const handler = async () => ({ summary: { total: 5 } })
  const wrapped = withLocalizedLog(handler)
  const result = await wrapped({ conf: {} }, { query: { timezone: 'America/Campo_Grande' } })
  t.alike(result, { summary: { total: 5 } })
  t.pass()
})

test('withLocalizedLog - accepts a custom log mapper', async (t) => {
  const handler = async () => ({ log: [{ segments: [{ from: 100, to: 200 }] }] })
  const customMapper = (log) => log.map((e) => ({ ...e, mapped: true }))
  const wrapped = withLocalizedLog(handler, customMapper)
  const result = await wrapped({ conf: {} }, { query: { timezone: 'America/Campo_Grande' } })
  t.ok(result.log[0].mapped, 'used the custom mapper instead of the default')
  t.pass()
})

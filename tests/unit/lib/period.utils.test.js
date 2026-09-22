'use strict'

const test = require('brittle')
const {
  getStartOfDay,
  localDayStart,
  convertMsToSeconds,
  aggregateByPeriod
} = require('../../../workers/lib/period.utils')
const { LOCKED_TIMEZONE_DEFAULT } = require('../../../workers/lib/constants')

test('getStartOfDay - returns start of day timestamp', (t) => {
  const ts = 1700050000000
  const result = getStartOfDay(ts)
  t.ok(result <= ts, 'should be less than or equal to input')
  t.is(result % 86400000, 0, 'should be divisible by 86400000')
  t.pass()
})

// ==================== localDayStart ====================

test('localDayStart - explicit UTC matches getStartOfDay', (t) => {
  const ts = Date.UTC(2026, 8, 1, 2)
  t.is(localDayStart(ts, 'UTC'), getStartOfDay(ts))
  t.pass()
})

test('localDayStart - aligns to local midnight for a non-UTC zone', (t) => {
  // 02:00 UTC on Sep 1 is still Aug 31 22:00 in America/Campo_Grande (UTC-4).
  const ts = Date.UTC(2026, 8, 1, 2)
  t.is(localDayStart(ts, 'America/Campo_Grande'), Date.UTC(2026, 7, 31, 4))
  t.pass()
})

test('localDayStart - no timezone arg falls back to LOCKED_TIMEZONE_DEFAULT, not UTC', (t) => {
  const ts = Date.UTC(2026, 8, 1, 2)
  t.is(localDayStart(ts), localDayStart(ts, LOCKED_TIMEZONE_DEFAULT))
  t.not(localDayStart(ts), getStartOfDay(ts), 'the constants default is not UTC, so this differs from the UTC bucket')
  t.pass()
})

test('getStartOfDay - already at start of day', (t) => {
  const ts = 1700006400000
  const result = getStartOfDay(ts)
  t.is(result, ts, 'should return same timestamp if already start of day')
  t.pass()
})

test('aggregateByPeriod - returns log unchanged for daily period', (t) => {
  const log = [
    { ts: 1700006400000, value: 10 },
    { ts: 1700092800000, value: 20 }
  ]
  const result = aggregateByPeriod(log, 'daily')
  t.is(result.length, 2, 'should return same length')
  t.alike(result, log, 'should return same entries')
  t.pass()
})

test('aggregateByPeriod - aggregates monthly', (t) => {
  const log = [
    { ts: 1700006400000, value: 10, region: 'us' },
    { ts: 1700092800000, value: 20, region: 'us' }
  ]
  const result = aggregateByPeriod(log, 'monthly')
  t.ok(result.length >= 1, 'should have at least one aggregated entry')
  t.ok(result[0].month, 'should have month field')
  t.ok(result[0].year, 'should have year field')
  t.pass()
})

test('aggregateByPeriod - aggregates yearly', (t) => {
  const log = [
    { ts: 1700006400000, value: 10, region: 'us' },
    { ts: 1700092800000, value: 20, region: 'us' }
  ]
  const result = aggregateByPeriod(log, 'yearly')
  t.ok(result.length >= 1, 'should have at least one aggregated entry')
  t.ok(result[0].year, 'should have year field')
  t.pass()
})

test('aggregateByPeriod - handles empty log', (t) => {
  const result = aggregateByPeriod([], 'monthly')
  t.is(result.length, 0, 'should return empty array')
  t.pass()
})

test('aggregateByPeriod - handles invalid timestamps', (t) => {
  const log = [
    { ts: 'invalid', value: 10 },
    { ts: 1700006400000, value: 20 }
  ]
  const result = aggregateByPeriod(log, 'monthly')
  t.ok(result.length >= 1, 'should skip invalid entries')
  t.pass()
})

test('aggregateByPeriod - meanKeys option averages instead of summing', (t) => {
  const ts = Date.UTC(2024, 0, 15)
  const log = [
    { ts, total: 10, rate: 0.1 },
    { ts: ts + 86400000, total: 20, rate: 0.3 }
  ]
  const result = aggregateByPeriod(log, 'monthly', [], { meanKeys: ['rate'] })
  t.is(result.length, 1, 'one monthly bucket')
  t.is(result[0].total, 30, 'sum keys still summed')
  t.is(result[0].rate, 0.2, 'mean key averaged: (0.1+0.3)/2')
})

test('aggregateByPeriod - meanKeys skip null/undefined values when averaging', (t) => {
  const ts = Date.UTC(2024, 0, 15)
  const log = [
    { ts, rate: 0.1 },
    { ts: ts + 86400000, rate: null },
    { ts: ts + 2 * 86400000, rate: 0.3 }
  ]
  const result = aggregateByPeriod(log, 'monthly', [], { meanKeys: ['rate'] })
  t.is(result[0].rate, 0.2, 'null skipped: (0.1+0.3)/2')
})

test('aggregateByPeriod - meanKeys returns null when no entries have the value', (t) => {
  const ts = Date.UTC(2024, 0, 15)
  const log = [
    { ts, rate: null },
    { ts: ts + 86400000, rate: undefined }
  ]
  const result = aggregateByPeriod(log, 'monthly', [], { meanKeys: ['rate'] })
  t.is(result[0].rate, null, 'all-null group yields null')
})

test('aggregateByPeriod - omitting options preserves legacy sum-everything behaviour', (t) => {
  const ts = Date.UTC(2024, 0, 15)
  const log = [
    { ts, rate: 0.1 },
    { ts: ts + 86400000, rate: 0.3 }
  ]
  const result = aggregateByPeriod(log, 'monthly')
  t.is(result[0].rate, 0.4, 'rate is summed when meanKeys not provided')
})

test('convertMsToSeconds - converts milliseconds to seconds', (t) => {
  t.is(convertMsToSeconds(1700006400000), 1700006400, 'should convert ms to seconds')
  t.is(convertMsToSeconds(1700006400500), 1700006400, 'should floor fractional seconds')
  t.pass()
})

test('aggregateByPeriod - monthly buckets are grouped and stamped in the given zone', (t) => {
  const log = [
    { ts: Date.UTC(2026, 7, 1), revenueBTC: 1 },
    { ts: Date.UTC(2026, 7, 2), revenueBTC: 2 }
  ]

  const [month] = aggregateByPeriod(log, 'monthly', [], { timezone: 'UTC' })

  t.is(month.ts, Date.UTC(2026, 7, 1), 'stamped on the UTC first of the month')
  t.is(month.month, 8)
  t.is(month.monthName, 'August', 'named from the UTC month, not the host month')
  t.is(month.revenueBTC, 3, 'both UTC days land in the same bucket')
  t.pass()
})

test('aggregateByPeriod - yearly buckets are grouped and stamped in the given zone', (t) => {
  const log = [
    { ts: Date.UTC(2026, 0, 1), revenueBTC: 1 },
    { ts: Date.UTC(2026, 11, 31), revenueBTC: 2 }
  ]

  const [year] = aggregateByPeriod(log, 'yearly', [], { timezone: 'UTC' })

  t.is(year.ts, Date.UTC(2026, 0, 1), 'stamped on the UTC first of the year')
  t.is(year.year, 2026)
  t.is(year.revenueBTC, 3, 'both UTC days land in the same bucket')
  t.pass()
})

test('aggregateByPeriod - monthly cuts in the resolved zone, not UTC', (t) => {
  // 02:00 UTC on Sep 1 is still Aug 31 in America/Campo_Grande (UTC-4).
  const log = [
    { ts: Date.UTC(2026, 7, 31, 20), revenueBTC: 1 },
    { ts: Date.UTC(2026, 8, 1, 2), revenueBTC: 2 }
  ]

  const [month] = aggregateByPeriod(log, 'monthly', [], { timezone: 'America/Campo_Grande' })

  t.is(month.month, 8, 'both entries fall in the local August, not a UTC-split August/September')
  t.is(month.revenueBTC, 3, 'both entries land in the same local-month bucket')
  t.pass()
})

test('aggregateByPeriod - weekly buckets are Monday-start in the resolved zone, matching pools', (t) => {
  // Sep 2 2026 is a Wednesday, and Aug 31 2026 is the Monday of its local week in
  // America/Campo_Grande (UTC-4).
  const log = [
    { ts: Date.UTC(2026, 8, 2, 12), revenueBTC: 1 },
    { ts: Date.UTC(2026, 8, 3, 12), revenueBTC: 2 }
  ]

  const [week] = aggregateByPeriod(log, 'weekly', [], { timezone: 'America/Campo_Grande' })

  t.is(week.ts, Date.UTC(2026, 7, 31, 4), 'stamped on the Monday-start local week, not the UTC Sunday-start week')
  t.is(week.revenueBTC, 3, 'both entries land in the same local week')
  t.pass()
})

test('aggregateByPeriod - weekly falls back to LOCKED_TIMEZONE_DEFAULT when no timezone option is given', (t) => {
  const ts = Date.UTC(2026, 8, 2, 12)
  const [withDefault] = aggregateByPeriod([{ ts, revenueBTC: 1 }], 'weekly')
  const [withExplicit] = aggregateByPeriod([{ ts, revenueBTC: 1 }], 'weekly', [], { timezone: LOCKED_TIMEZONE_DEFAULT })

  t.is(withDefault.ts, withExplicit.ts, 'omitting timezone resolves the same as passing the constants default explicitly')
  t.pass()
})

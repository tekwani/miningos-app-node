'use strict'

const { PERIOD_TYPES, NON_METRIC_KEYS, LOCKED_TIMEZONE_DEFAULT } = require('./constants')

const getStartOfDay = (ts) => Math.floor(ts / 86400000) * 86400000

// Milliseconds to add to a UTC instant to read it as wall-clock time in `timeZone`.
function zoneOffsetMs (ts, timeZone) {
  const parts = {}
  const formatted = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).formatToParts(new Date(ts))
  for (const { type, value } of formatted) parts[type] = value

  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second)
  return asUtc - ts
}

// First instant of the local calendar day (in `timeZone`) containing `ts`. DST-safe:
// resolved twice because the naive guess can land on the wrong side of a shift.
// A caller that doesn't pass a zone at all gets LOCKED_TIMEZONE_DEFAULT rather than
// silently landing on the UTC grid - this function has no ctx, so it can't see the
// site's own featureConfig.lockedTimezone, only the constants fallback. A caller that
// wants true UTC has to say so explicitly with `'UTC'`.
const localDayStart = (ts, timeZone) => {
  const zone = timeZone || LOCKED_TIMEZONE_DEFAULT
  if (zone === 'UTC') return getStartOfDay(ts)

  const parts = {}
  const formatted = new Intl.DateTimeFormat('en-US', {
    timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date(ts))
  for (const { type, value } of formatted) parts[type] = value

  const wallClock = Date.UTC(+parts.year, +parts.month - 1, +parts.day)
  const asTs = wallClock - zoneOffsetMs(wallClock, zone)
  const settled = zoneOffsetMs(asTs, zone)
  return settled === zoneOffsetMs(wallClock, zone) ? asTs : wallClock - settled
}

const convertMsToSeconds = (timestampMs) => {
  return Math.floor(timestampMs / 1000)
}

// Y/M/D fields of `ts`, read in `timeZone`. 1-based month, matching Date's calendar
// fields elsewhere in this file.
const localDateParts = (ts, timeZone) => {
  const zone = timeZone || LOCKED_TIMEZONE_DEFAULT
  const parts = {}
  for (const { type, value } of new Intl.DateTimeFormat('en-US', {
    timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date(ts))) parts[type] = value
  return { year: +parts.year, month: +parts.month, day: +parts.day }
}

// First instant of the local calendar month (`month` 0-based, matching `Date`) in
// `timeZone`. DST-safe via the same two-pass resolution as localDayStart.
const localMonthStart = (year, month, timeZone) => {
  const zone = timeZone || LOCKED_TIMEZONE_DEFAULT
  if (zone === 'UTC') return Date.UTC(year, month, 1)

  const wallClock = Date.UTC(year, month, 1)
  const asTs = wallClock - zoneOffsetMs(wallClock, zone)
  const settled = zoneOffsetMs(asTs, zone)
  return settled === zoneOffsetMs(wallClock, zone) ? asTs : wallClock - settled
}

const localYearStart = (year, timeZone) => localMonthStart(year, 0, timeZone)

// Monday-start local week (in `timeZone`) containing `ts`. Mirrors pools.handlers'
// localWeekStartTs, so finance and pools cut weeks the same way.
const localWeekStart = (ts, timeZone) => {
  const zone = timeZone || LOCKED_TIMEZONE_DEFAULT
  const dayStart = localDayStart(ts, zone)
  const dow = new Date(dayStart + zoneOffsetMs(dayStart, zone)).getUTCDay() // 0=Sun..6=Sat
  const daysSinceMonday = (dow + 6) % 7
  if (!daysSinceMonday) return dayStart
  // A rough step back by whole days, corrected by re-deriving the exact local day
  // start - keeps the result right even if a DST shift falls inside the week.
  return localDayStart(dayStart - daysSinceMonday * 86400000, zone)
}

const PERIOD_CALCULATORS = {
  daily: (timestamp) => getStartOfDay(timestamp),
  weekly: (timestamp) => {
    const date = new Date(timestamp)
    const day = date.getUTCDay()
    const diff = date.getUTCDate() - day
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), diff)).getTime()
  },
  monthly: (timestamp) => {
    const date = new Date(timestamp)
    return new Date(date.getFullYear(), date.getMonth(), 1).getTime()
  },
  yearly: (timestamp) => {
    const date = new Date(timestamp)
    return new Date(date.getFullYear(), 0, 1).getTime()
  }
}

const aggregateByPeriod = (log, period, nonMetricKeys = [], options = {}) => {
  if (period === PERIOD_TYPES.DAILY) {
    return log
  }

  const timeZone = options.timezone || LOCKED_TIMEZONE_DEFAULT
  const allNonMetricKeys = new Set([...NON_METRIC_KEYS, ...nonMetricKeys])
  const meanKeys = new Set(options.meanKeys || [])

  const grouped = log.reduce((acc, entry) => {
    const ts = Number(entry.ts)
    if (!Number.isFinite(ts)) return acc

    let groupKey

    if (period === PERIOD_TYPES.MONTHLY) {
      const { year, month } = localDateParts(ts, timeZone)
      groupKey = `${year}-${String(month).padStart(2, '0')}`
    } else if (period === PERIOD_TYPES.YEARLY) {
      groupKey = `${localDateParts(ts, timeZone).year}`
    } else if (period === PERIOD_TYPES.WEEKLY) {
      groupKey = `${localWeekStart(ts, timeZone)}`
    } else {
      groupKey = `${entry.ts}`
    }

    if (!acc[groupKey]) {
      acc[groupKey] = []
    }
    acc[groupKey].push(entry)
    return acc
  }, {})

  const aggregatedResults = Object.entries(grouped).map(([groupKey, entries]) => {
    const meanCounts = {}
    const aggregated = entries.reduce((acc, entry) => {
      Object.entries(entry).forEach(([key, val]) => {
        if (allNonMetricKeys.has(key)) {
          if (!acc[key] || acc[key] === null || acc[key] === undefined) {
            acc[key] = val
          }
        } else if (meanKeys.has(key)) {
          if (val !== null && val !== undefined && !isNaN(Number(val))) {
            acc[key] = (acc[key] || 0) + Number(val)
            meanCounts[key] = (meanCounts[key] || 0) + 1
          }
        } else {
          const numVal = Number(val) || 0
          acc[key] = (acc[key] || 0) + numVal
        }
      })
      return acc
    }, {})

    for (const key of meanKeys) {
      aggregated[key] = meanCounts[key] ? aggregated[key] / meanCounts[key] : null
    }

    try {
      if (period === PERIOD_TYPES.MONTHLY) {
        const [year, month] = groupKey.split('-').map(Number)
        const ts = localMonthStart(year, month - 1, timeZone)
        if (!Number.isFinite(ts)) {
          throw new Error(`Invalid date for monthly grouping: ${groupKey}`)
        }

        aggregated.ts = ts
        aggregated.month = month
        aggregated.year = year
        aggregated.monthName = new Date(ts).toLocaleString('en-US', { month: 'long', timeZone })
      } else if (period === PERIOD_TYPES.YEARLY) {
        const year = parseInt(groupKey)
        const ts = localYearStart(year, timeZone)
        if (!Number.isFinite(ts)) {
          throw new Error(`Invalid date for yearly grouping: ${groupKey}`)
        }

        aggregated.ts = ts
        aggregated.year = year
      } else if (period === PERIOD_TYPES.WEEKLY) {
        aggregated.ts = Number(groupKey)
      }
    } catch (error) {
      aggregated.ts = entries[0].ts

      try {
        const fallbackTs = Number(entries[0].ts)
        if (Number.isFinite(fallbackTs)) {
          const { year, month } = localDateParts(fallbackTs, timeZone)
          if (period === PERIOD_TYPES.MONTHLY) {
            aggregated.month = month
            aggregated.year = year
            aggregated.monthName = new Date(fallbackTs).toLocaleString('en-US', { month: 'long', timeZone })
          } else if (period === PERIOD_TYPES.YEARLY) {
            aggregated.year = year
          }
        }
      } catch (fallbackError) {
        console.warn('Could not extract date info from fallback timestamp', fallbackError)
      }
    }

    return aggregated
  })

  return aggregatedResults.sort((a, b) => Number(b.ts) - Number(a.ts))
}

const getPeriodKey = (timestamp, period) => {
  const calculator = PERIOD_CALCULATORS[period] || PERIOD_CALCULATORS.daily
  return calculator(timestamp)
}

const getPeriodEndDate = (periodTs, period) => {
  const periodEnd = new Date(periodTs)

  switch (period) {
    case PERIOD_TYPES.WEEKLY:
      periodEnd.setDate(periodEnd.getDate() + 7)
      break
    case PERIOD_TYPES.MONTHLY:
      periodEnd.setMonth(periodEnd.getMonth() + 1)
      break
    case PERIOD_TYPES.YEARLY:
      periodEnd.setFullYear(periodEnd.getFullYear() + 1)
      break
  }

  return periodEnd
}

const isTimestampInPeriod = (timestamp, periodTs, period) => {
  if (period === PERIOD_TYPES.DAILY) return timestamp === periodTs

  const periodEnd = getPeriodEndDate(periodTs, period)
  return timestamp >= periodTs && timestamp < periodEnd.getTime()
}

const getFilteredPeriodData = (
  sourceData,
  periodTs,
  period,
  filterFn = (entries) => entries
) => {
  if (period === PERIOD_TYPES.DAILY) {
    return sourceData[periodTs] || (typeof filterFn === 'function' ? {} : 0)
  }

  const entriesInPeriod = Object.entries(sourceData).filter(([tsStr]) => {
    const timestamp = Number(tsStr)
    return isTimestampInPeriod(timestamp, periodTs, period)
  })

  return filterFn(entriesInPeriod, sourceData)
}

module.exports = {
  getStartOfDay,
  localDayStart,
  convertMsToSeconds,
  getPeriodEndDate,
  aggregateByPeriod,
  getPeriodKey,
  isTimestampInPeriod,
  getFilteredPeriodData
}

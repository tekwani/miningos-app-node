'use strict'

const {
  ENDPOINTS,
  HTTP_METHODS
} = require('../../constants')
const {
  getHashrate,
  getConsumption,
  getEfficiency,
  getMinerStatus,
  getMinersByContainer,
  getInventorySummary,
  getMinersByType,
  getInventoryMinerDistribution,
  getPowerMode,
  getPowerModeTimeline,
  localizePowerModeTimelineLog,
  getTemperature,
  getCooling,
  getDowntime,
  getContainerTelemetry,
  getContainerHistory
} = require('../handlers/metrics.handlers')
const { getSiteLiveStatus } = require('../handlers/site.handlers')
const { getRevenueHourly } = require('../handlers/finance.handlers')
const { withLocalizedLog } = require('../../metrics.utils')
const { createCachedAuthRoute } = require('../lib/routeHelpers')

module.exports = (ctx) => {
  const schemas = require('../schemas/metrics.schemas.js')

  return [
    {
      method: HTTP_METHODS.GET,
      url: ENDPOINTS.METRICS_HASHRATE,
      schema: {
        querystring: schemas.query.hashrate
      },
      ...createCachedAuthRoute(
        ctx,
        (req) => [
          'metrics/hashrate',
          req.query.start,
          req.query.end,
          req.query.interval,
          req.query.timezone,
          req.query.groupBy,
          req.query.container,
          req.query.current,
          req.query.nominal,
          req.query.pool,
          req.query.racks,
          req.query.offset,
          req.query.limit,
          req.query.reverse
        ],
        ENDPOINTS.METRICS_HASHRATE,
        getHashrate
      )
    },
    {
      method: HTTP_METHODS.GET,
      url: ENDPOINTS.METRICS_CONSUMPTION,
      schema: {
        querystring: schemas.query.consumption
      },
      ...createCachedAuthRoute(
        ctx,
        (req) => [
          'metrics/consumption',
          req.query.start,
          req.query.end,
          req.query.interval,
          req.query.timezone,
          req.query.groupBy,
          req.query.byMeter,
          req.query.racks
        ],
        ENDPOINTS.METRICS_CONSUMPTION,
        withLocalizedLog(getConsumption)
      )
    },
    {
      method: HTTP_METHODS.GET,
      url: ENDPOINTS.METRICS_EFFICIENCY,
      schema: {
        querystring: schemas.query.efficiency
      },
      ...createCachedAuthRoute(
        ctx,
        (req) => [
          'metrics/efficiency',
          req.query.start,
          req.query.end,
          req.query.interval,
          req.query.timezone,
          req.query.groupBy,
          req.query.racks
        ],
        ENDPOINTS.METRICS_EFFICIENCY,
        withLocalizedLog(getEfficiency)
      )
    },
    {
      method: HTTP_METHODS.GET,
      url: ENDPOINTS.METRICS_MINER_STATUS,
      schema: {
        querystring: schemas.query.minerStatus
      },
      ...createCachedAuthRoute(
        ctx,
        (req) => [
          'metrics/miner-status',
          req.query.start,
          req.query.end,
          req.query.timezone,
          req.query.groupBy
        ],
        ENDPOINTS.METRICS_MINER_STATUS,
        withLocalizedLog(getMinerStatus)
      )
    },
    {
      method: HTTP_METHODS.GET,
      url: ENDPOINTS.METRICS_MINERS_BY_CONTAINER,
      schema: {
        querystring: schemas.query.minersByContainer
      },
      ...createCachedAuthRoute(
        ctx,
        () => ['metrics/miners/by-container'],
        ENDPOINTS.METRICS_MINERS_BY_CONTAINER,
        getMinersByContainer
      )
    },
    {
      method: HTTP_METHODS.GET,
      url: ENDPOINTS.METRICS_SITE_SUMMARY,
      schema: {
        querystring: schemas.query.siteSummary
      },
      ...createCachedAuthRoute(
        ctx,
        () => ['metrics/site/summary'],
        ENDPOINTS.METRICS_SITE_SUMMARY,
        getSiteLiveStatus
      )
    },
    {
      method: HTTP_METHODS.GET,
      url: ENDPOINTS.METRICS_INVENTORY_SUMMARY,
      schema: {
        querystring: schemas.query.inventorySummary
      },
      ...createCachedAuthRoute(
        ctx,
        () => ['metrics/inventory/summary'],
        ENDPOINTS.METRICS_INVENTORY_SUMMARY,
        getInventorySummary
      )
    },
    {
      method: HTTP_METHODS.GET,
      url: ENDPOINTS.METRICS_MINERS_BY_TYPE,
      schema: {
        querystring: schemas.query.minersByType
      },
      ...createCachedAuthRoute(
        ctx,
        () => ['metrics/miners/by-type'],
        ENDPOINTS.METRICS_MINERS_BY_TYPE,
        getMinersByType
      )
    },
    {
      method: HTTP_METHODS.GET,
      url: ENDPOINTS.METRICS_INVENTORY_MINER_DISTRIBUTION,
      schema: {
        querystring: schemas.query.inventoryMinerDistribution
      },
      ...createCachedAuthRoute(
        ctx,
        () => ['metrics/inventory/miner-distribution'],
        ENDPOINTS.METRICS_INVENTORY_MINER_DISTRIBUTION,
        getInventoryMinerDistribution
      )
    },
    {
      method: HTTP_METHODS.GET,
      url: ENDPOINTS.METRICS_REVENUE_HOURLY,
      schema: {
        querystring: schemas.query.revenueHourly
      },
      ...createCachedAuthRoute(
        ctx,
        (req) => ['metrics/revenue/hourly', req.query.start, req.query.end, req.query.timezone, req.query.pool],
        ENDPOINTS.METRICS_REVENUE_HOURLY,
        withLocalizedLog(getRevenueHourly)
      )
    },
    {
      method: HTTP_METHODS.GET,
      url: ENDPOINTS.METRICS_POWER_MODE,
      schema: {
        querystring: schemas.query.powerMode
      },
      ...createCachedAuthRoute(
        ctx,
        (req) => [
          'metrics/power-mode',
          req.query.start,
          req.query.end,
          req.query.interval,
          req.query.timezone
        ],
        ENDPOINTS.METRICS_POWER_MODE,
        withLocalizedLog(getPowerMode)
      )
    },
    {
      method: HTTP_METHODS.GET,
      url: ENDPOINTS.METRICS_POWER_MODE_TIMELINE,
      schema: {
        querystring: schemas.query.powerModeTimeline
      },
      ...createCachedAuthRoute(
        ctx,
        (req) => [
          'metrics/power-mode/timeline',
          req.query.start,
          req.query.end,
          req.query.interval,
          req.query.timezone,
          req.query.container
        ],
        ENDPOINTS.METRICS_POWER_MODE_TIMELINE,
        withLocalizedLog(getPowerModeTimeline, localizePowerModeTimelineLog)
      )
    },
    {
      method: HTTP_METHODS.GET,
      url: ENDPOINTS.METRICS_TEMPERATURE,
      schema: {
        querystring: schemas.query.temperature
      },
      ...createCachedAuthRoute(
        ctx,
        (req) => [
          'metrics/temperature',
          req.query.start,
          req.query.end,
          req.query.interval,
          req.query.timezone,
          req.query.container
        ],
        ENDPOINTS.METRICS_TEMPERATURE,
        withLocalizedLog(getTemperature)
      )
    },
    {
      method: HTTP_METHODS.GET,
      url: ENDPOINTS.METRICS_COOLING,
      schema: {
        querystring: schemas.query.cooling
      },
      ...createCachedAuthRoute(
        ctx,
        (req) => [
          'metrics/cooling',
          req.query.start,
          req.query.end,
          req.query.interval,
          req.query.timezone
        ],
        ENDPOINTS.METRICS_COOLING,
        withLocalizedLog(getCooling)
      )
    },
    {
      method: HTTP_METHODS.GET,
      url: ENDPOINTS.METRICS_DOWNTIME,
      schema: {
        querystring: schemas.query.downtime
      },
      ...createCachedAuthRoute(
        ctx,
        (req) => [
          'metrics/downtime',
          req.query.start,
          req.query.end,
          req.query.interval,
          req.query.timezone
        ],
        ENDPOINTS.METRICS_DOWNTIME,
        withLocalizedLog(getDowntime)
      )
    },
    {
      method: HTTP_METHODS.GET,
      url: ENDPOINTS.METRICS_CONTAINER_HISTORY,
      schema: {
        querystring: schemas.query.containerHistory
      },
      ...createCachedAuthRoute(
        ctx,
        (req) => [
          'metrics/containers/history',
          req.params.id,
          req.query.start,
          req.query.end,
          req.query.interval,
          req.query.timezone,
          req.query.limit
        ],
        ENDPOINTS.METRICS_CONTAINER_HISTORY,
        withLocalizedLog(getContainerHistory)
      )
    },
    {
      method: HTTP_METHODS.GET,
      url: ENDPOINTS.METRICS_CONTAINER_TELEMETRY,
      schema: {
        querystring: schemas.query.containerTelemetry
      },
      ...createCachedAuthRoute(
        ctx,
        (req) => [
          'metrics/containers/telemetry',
          req.params.id
        ],
        ENDPOINTS.METRICS_CONTAINER_TELEMETRY,
        getContainerTelemetry
      )
    }
  ]
}

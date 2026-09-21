'use strict'

const {
  ENDPOINTS,
  HTTP_METHODS,
  AUTH_PERMISSIONS
} = require('../../constants')
const {
  getEnergyBalance,
  getEbitda,
  getCostSummary,
  getSubsidyFees,
  getRevenue,
  getRevenueSummary,
  getHashRevenue,
  getPowerCost
} = require('../handlers/finance.handlers')
const { withLocalizedLog } = require('../../metrics.utils')
const { createCachedAuthRoute } = require('../lib/routeHelpers')

const FINANCE_PERMS = [AUTH_PERMISSIONS.REVENUE]

module.exports = (ctx) => {
  const schemas = require('../schemas/finance.schemas.js')

  return [
    {
      method: HTTP_METHODS.GET,
      url: ENDPOINTS.FINANCE_ENERGY_BALANCE,
      schema: {
        querystring: schemas.query.energyBalance
      },
      ...createCachedAuthRoute(
        ctx,
        (req) => [
          'finance/energy-balance',
          req.query.start,
          req.query.end,
          req.query.period,
          req.query.timezone
        ],
        ENDPOINTS.FINANCE_ENERGY_BALANCE,
        withLocalizedLog(getEnergyBalance),
        FINANCE_PERMS
      )
    },
    {
      method: HTTP_METHODS.GET,
      url: ENDPOINTS.FINANCE_EBITDA,
      schema: {
        querystring: schemas.query.ebitda
      },
      ...createCachedAuthRoute(
        ctx,
        (req) => [
          'finance/ebitda',
          req.query.start,
          req.query.end,
          req.query.period,
          req.query.timezone
        ],
        ENDPOINTS.FINANCE_EBITDA,
        withLocalizedLog(getEbitda),
        FINANCE_PERMS
      )
    },
    {
      method: HTTP_METHODS.GET,
      url: ENDPOINTS.FINANCE_COST_SUMMARY,
      schema: {
        querystring: schemas.query.costSummary
      },
      ...createCachedAuthRoute(
        ctx,
        (req) => [
          'finance/cost-summary',
          req.query.start,
          req.query.end,
          req.query.period,
          req.query.timezone
        ],
        ENDPOINTS.FINANCE_COST_SUMMARY,
        withLocalizedLog(getCostSummary),
        FINANCE_PERMS
      )
    },
    {
      method: HTTP_METHODS.GET,
      url: ENDPOINTS.FINANCE_SUBSIDY_FEES,
      schema: {
        querystring: schemas.query.subsidyFees
      },
      ...createCachedAuthRoute(
        ctx,
        (req) => [
          'finance/subsidy-fees',
          req.query.start,
          req.query.end,
          req.query.period,
          req.query.timezone
        ],
        ENDPOINTS.FINANCE_SUBSIDY_FEES,
        withLocalizedLog(getSubsidyFees),
        FINANCE_PERMS
      )
    },
    {
      method: HTTP_METHODS.GET,
      url: ENDPOINTS.FINANCE_REVENUE,
      schema: {
        querystring: schemas.query.revenue
      },
      ...createCachedAuthRoute(
        ctx,
        (req) => [
          'finance/revenue',
          req.query.start,
          req.query.end,
          req.query.period,
          req.query.pool,
          req.query.timezone
        ],
        ENDPOINTS.FINANCE_REVENUE,
        withLocalizedLog(getRevenue),
        FINANCE_PERMS
      )
    },
    {
      method: HTTP_METHODS.GET,
      url: ENDPOINTS.FINANCE_REVENUE_SUMMARY,
      schema: {
        querystring: schemas.query.revenueSummary
      },
      ...createCachedAuthRoute(
        ctx,
        (req) => [
          'finance/revenue-summary',
          req.query.start,
          req.query.end,
          req.query.period,
          req.query.timezone
        ],
        ENDPOINTS.FINANCE_REVENUE_SUMMARY,
        withLocalizedLog(getRevenueSummary),
        FINANCE_PERMS
      )
    },
    {
      method: HTTP_METHODS.GET,
      url: ENDPOINTS.FINANCE_HASH_REVENUE,
      schema: {
        querystring: schemas.query.hashRevenue
      },
      ...createCachedAuthRoute(
        ctx,
        (req) => [
          'finance/hash-revenue',
          req.query.start,
          req.query.end,
          req.query.period,
          req.query.timezone
        ],
        ENDPOINTS.FINANCE_HASH_REVENUE,
        withLocalizedLog(getHashRevenue),
        FINANCE_PERMS
      )
    },
    {
      method: HTTP_METHODS.GET,
      url: ENDPOINTS.FINANCE_POWER_COST,
      schema: {
        querystring: schemas.query.powerCost
      },
      ...createCachedAuthRoute(
        ctx,
        (req) => [
          'finance/power-cost',
          req.query.start,
          req.query.end,
          req.query.timezone
        ],
        ENDPOINTS.FINANCE_POWER_COST,
        withLocalizedLog(getPowerCost),
        FINANCE_PERMS
      )
    }
  ]
}

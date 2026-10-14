'use strict'

const { ENDPOINTS, HTTP_METHODS, AUTH_PERMISSIONS, CONSUMPTION_FIELDS } = require('../../constants')
const { getEnergyConsumption, saveEnergyConsumption, getEnergyForecast, setAvailableEnergy, getEnergyForecastHistory, setForecastSettings, getForecastSettings, setForecastOverride, setAvailableEnergyHistory, setForecastOverrideHistory } = require('../handlers/energy.handlers')
const { createCachedAuthRoute, createAuthRoute, rejectTimezone } = require('../lib/routeHelpers')
const schemas = require('../schemas/energy.schemas')

// Fastify coerces body types by default ("" -> null, false -> 0, "7" -> 7). Here that
// would silently clear or zero a stored value, so the raw body is checked before
// validation: ts and every value must be real JSON numbers (values may also be null).
const requireStrictConsumptionBody = (req, rep, done) => {
  const entries = req.body?.entries
  if (Array.isArray(entries)) {
    for (const entry of entries) {
      if (!entry || typeof entry !== 'object') continue // the schema rejects these
      if (entry.ts !== undefined && typeof entry.ts !== 'number') return done(new Error('ERR_TS_INVALID'))
      for (const field of CONSUMPTION_FIELDS) {
        const val = entry[field]
        if (val !== undefined && val !== null && typeof val !== 'number') return done(new Error('ERR_CONSUMPTION_INVALID'))
      }
    }
  }
  done()
}

module.exports = (ctx) => [
  {
    method: HTTP_METHODS.GET,
    url: ENDPOINTS.ENERGY_FORECAST,
    ...createCachedAuthRoute(
      ctx,
      (req) => ['energy-forecast'],
      ENDPOINTS.ENERGY_FORECAST,
      getEnergyForecast,
      [AUTH_PERMISSIONS.FORECAST_SUMMARY]
    )
  },
  {
    method: HTTP_METHODS.GET,
    url: ENDPOINTS.ENERGY_FORECAST_HISTORY,
    preValidation: rejectTimezone(),
    schema: {
      querystring: {
        type: 'object',
        properties: {
          start: { type: 'integer', minimum: 0 },
          end: { type: 'integer', minimum: 0 }
        },
        required: ['start', 'end']
      }
    },
    ...createCachedAuthRoute(
      ctx,
      (req) => ['energy-forecast-history', req.query.start, req.query.end],
      ENDPOINTS.ENERGY_FORECAST_HISTORY,
      getEnergyForecastHistory,
      [AUTH_PERMISSIONS.FORECAST_OVERVIEW]
    )
  },
  {
    method: HTTP_METHODS.POST,
    url: ENDPOINTS.ENERGY_AVAILABLE,
    ...createAuthRoute(ctx, async (ctx, req) => {
      return await setAvailableEnergy(ctx, req)
    }, [AUTH_PERMISSIONS.FORECAST_SUMMARY]),
    schema: {
      body: schemas.body.availableEnergy
    }
  },
  {
    method: HTTP_METHODS.POST,
    url: ENDPOINTS.ENERGY_AVAILABLE_HISTORY,
    ...createAuthRoute(ctx, async (ctx, req) => {
      return await setAvailableEnergyHistory(ctx, req)
    }, [AUTH_PERMISSIONS.FORECAST_OVERVIEW]),
    schema: {
      body: schemas.body.availableEnergyHistory
    }
  },
  {
    method: HTTP_METHODS.POST,
    url: ENDPOINTS.ENERGY_FORECAST_SETTINGS,
    ...createAuthRoute(ctx, async (ctx, req) => {
      return await setForecastSettings(ctx, req)
    }, [AUTH_PERMISSIONS.FORECAST_SETTINGS]),
    schema: {
      body: schemas.body.forecastSettings
    }
  },
  {
    method: HTTP_METHODS.GET,
    url: ENDPOINTS.ENERGY_FORECAST_SETTINGS,
    ...createCachedAuthRoute(
      ctx,
      (req) => ['forecast-settings'],
      ENDPOINTS.ENERGY_FORECAST_SETTINGS,
      getForecastSettings,
      [AUTH_PERMISSIONS.FORECAST_SETTINGS]
    )
  },
  {
    method: HTTP_METHODS.POST,
    url: ENDPOINTS.ENERGY_FORECAST_OVERRIDE,
    ...createAuthRoute(ctx, async (ctx, req) => {
      return await setForecastOverride(ctx, req)
    }, [AUTH_PERMISSIONS.FORECAST_OVERVIEW]),
    schema: {
      body: schemas.body.forecastOverride
    }
  },
  {
    method: HTTP_METHODS.POST,
    url: ENDPOINTS.ENERGY_FORECAST_OVERRIDE_HISTORY,
    ...createAuthRoute(ctx, async (ctx, req) => {
      return await setForecastOverrideHistory(ctx, req)
    }, [AUTH_PERMISSIONS.FORECAST_OVERVIEW]),
    schema: {
      body: schemas.body.forecastOverride
    }
  },
  {
    method: HTTP_METHODS.GET,
    url: ENDPOINTS.ENERGY_CONSUMPTION,
    preValidation: rejectTimezone(),
    schema: {
      querystring: schemas.query.energyConsumption
    },
    ...createCachedAuthRoute(
      ctx,
      (req) => ['energy-consumption', req.query.start, req.query.end],
      ENDPOINTS.ENERGY_CONSUMPTION,
      getEnergyConsumption,
      [AUTH_PERMISSIONS.POWERMETER]
    )
  },
  {
    method: HTTP_METHODS.POST,
    url: ENDPOINTS.ENERGY_CONSUMPTION,
    preValidation: [rejectTimezone(), requireStrictConsumptionBody],
    ...createAuthRoute(ctx, saveEnergyConsumption, [AUTH_PERMISSIONS.POWERMETER]),
    schema: {
      body: schemas.body.energyConsumption
    }
  }
]

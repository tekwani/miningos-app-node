'use strict'

const { CONSUMPTION_FIELDS } = require('../../constants')

// At most a month of hours (31 days x 24) per request.
const MAX_CONSUMPTION_ENTRIES = 744

// A number >= 0 (zero is a real reading) replaces the stored value; null clears it (stored and returned as null).
const consumptionValue = { type: ['number', 'null'], minimum: 0 }

const schemas = {
  query: {
    energyConsumption: {
      type: 'object',
      properties: {
        start: { type: 'integer', minimum: 0 },
        end: { type: 'integer', minimum: 0 },
        overwriteCache: { type: 'boolean' }
      },
      required: ['start', 'end']
    }
  },
  body: {
    energyConsumption: {
      type: 'object',
      properties: {
        entries: {
          type: 'array',
          minItems: 1,
          maxItems: MAX_CONSUMPTION_ENTRIES,
          items: {
            type: 'object',
            properties: {
              ts: { type: 'integer', minimum: 0 },
              ...Object.fromEntries(CONSUMPTION_FIELDS.map(field => [field, consumptionValue]))
            },
            required: ['ts'],
            // an entry must pass at least one value; values it omits are left as stored
            anyOf: CONSUMPTION_FIELDS.map(field => ({ required: [field] })),
            additionalProperties: false
          }
        }
      },
      required: ['entries'],
      additionalProperties: false
    },
    availableEnergy: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              start: { type: 'integer', minimum: 0 },
              end: { type: 'integer', minimum: 0 },
              availableMw: { type: 'number', minimum: 0, maximum: 48 },
              available: { type: ['boolean', 'integer'], minimum: 0, maximum: 1 }
            },
            required: ['start'],
            anyOf: [
              { required: ['availableMw'] },
              { required: ['available'] }
            ]
          }
        }
      },
      required: ['data']
    },
    availableEnergyHistory: {
      type: 'object',
      properties: {
        start: { type: 'integer', minimum: 0 },
        end: { type: 'integer', minimum: 0 },
        availableMw: { type: 'number', minimum: 0, maximum: 48 },
        available: { type: 'boolean' }
      },
      required: [
        'start',
        'end'
      ],
      anyOf: [
        { required: ['availableMw'] },
        { required: ['available'] }
      ]
    },
    forecastSettings: {
      type: 'object',
      properties: {
        miningRevenueTaxFees: {
          type: 'object'
        },
        sellingEnergyTaxFees: {
          type: 'object'
        },
        buyingEnergyTaxFees: {
          type: 'object'
        },
        lcoe: {
          type: 'object'
        },
        siteEfficiency: {
          type: 'object'
        }
      },
      required: [
        'miningRevenueTaxFees',
        'sellingEnergyTaxFees',
        'buyingEnergyTaxFees',
        'lcoe',
        'siteEfficiency'
      ]
    },
    forecastOverride: {
      type: 'object',
      properties: {
        start: { type: 'integer', minimum: 0 },
        end: { type: 'integer', minimum: 0 },
        manualOverrideMine: { type: 'boolean' }
      },
      required: [
        'start',
        'end',
        'manualOverrideMine'
      ]
    }
  }
}

module.exports = schemas

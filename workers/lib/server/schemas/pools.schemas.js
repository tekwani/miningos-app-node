'use strict'

const schemas = {
  query: {
    pools: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        sort: { type: 'string' },
        fields: { type: 'string' },
        overwriteCache: { type: 'boolean' }
      }
    },
    balanceHistory: {
      type: 'object',
      properties: {
        start: { type: 'integer', minimum: 0 },
        end: { type: 'integer', minimum: 0 },
        range: { type: 'string', enum: ['1D', '1W', '1M'] },
        timezone: { type: 'string', maxLength: 100 },
        overwriteCache: { type: 'boolean' }
      },
      required: ['start', 'end']
    },
    poolStatsAggregate: {
      type: 'object',
      properties: {
        start: { type: 'integer', minimum: 0 },
        end: { type: 'integer', minimum: 0 },
        range: { type: 'string', enum: ['daily', 'weekly', 'monthly'] },
        pool: { type: 'string' },
        overwriteCache: { type: 'boolean' }
      },
      required: ['start', 'end']
    }
  }
}

module.exports = schemas

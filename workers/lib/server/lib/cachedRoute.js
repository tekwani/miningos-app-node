'use strict'

function dequeueRequests (requests, key, data, err = null) {
  requests.get(key).forEach(({ resolve, reject }) => {
    if (err) reject(err)
    else resolve(data)
  })
  requests.delete(key)
}

async function cachedRoute (ctx, ckeyParts, apiPath, func, overwriteCache = false) {
  // Fall back to the default bucket when the configured one does not exist
  // (e.g. config referencing a bucket the running build does not ship yet),
  // so a config/code deploy-order mismatch degrades to 30s caching, not 500s
  const lru = ctx[`lru_${ctx.conf.cacheTiming[apiPath] || '30s'}`] || ctx.lru_30s
  if (!lru) throw new Error('INTERNAL_SERVER_ERROR')

  const ckey = ckeyParts.map(k => k ?? '-').join(':')

  if (overwriteCache) {
    const data = await func()
    lru.set(ckey, data)
    return data
  }

  const cached = lru.get(ckey)
  if (cached !== undefined) return cached

  const requests = ctx.queuedRequests

  if (requests.has(ckey)) {
    return new Promise((resolve, reject) => {
      requests.get(ckey).push({ resolve, reject })
    })
  }

  requests.set(ckey, [])

  let data
  try {
    data = await func()
  } catch (err) {
    dequeueRequests(requests, ckey, null, err)
    throw err
  }

  lru.set(ckey, data)
  dequeueRequests(requests, ckey, data)

  return data
}

/**
 * The lru package only expires an entry when that exact key is read again, so
 * entries whose key is never repeated (e.g. tail-log keyed on a moving start/end)
 * stay resident until the bucket fills up to `max`. Peeking every key evicts the
 * expired ones so a bucket only holds what is still within its maxAge.
 *
 * @param {Object} lruFac - a bfx-facs-lru facility
 * @returns {number} number of entries evicted
 */
function sweepExpired (lruFac) {
  const cache = lruFac?.cache
  if (!cache) return 0

  const before = cache.length
  for (const key of cache.keys) cache.peek(key)
  return before - cache.length
}

module.exports = { cachedRoute, sweepExpired }

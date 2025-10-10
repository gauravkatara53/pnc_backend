// utils/cache.js
import NodeCache from "node-cache";

// Cache instance with 7 days TTL (in seconds)
const cache = new NodeCache({ stdTTL: 1 * 24 * 60 * 60, checkperiod: 600 });

const setCache = (key, value, ttl) => {
  return cache.set(key, value, ttl);
};

const getCache = (key) => {
  return cache.get(key);
};

const deleteCache = (key) => {
  return cache.del(key);
};

const deleteCacheByPrefix = (pattern) => {
  const keys = cache.keys();
  let deletedCount = 0;

  keys.forEach((key) => {
    // Convert pattern with wildcards to regex
    const regexPattern = pattern.replace(/\*/g, ".*");
    const regex = new RegExp(`^${regexPattern}$`);

    if (regex.test(key)) {
      cache.del(key);
      deletedCount++;
      console.log(`🗑️ NodeCache cleared: ${key}`);
    }
  });

  if (deletedCount > 0) {
    console.log(
      `🧹 NodeCache: Cleared ${deletedCount} keys matching pattern: ${pattern}`
    );
  }

  return deletedCount;
};

const flushCache = () => {
  return cache.flushAll();
};

const getOrSetCache = async (key, fetchFn, ttl) => {
  const cached = cache.get(key);

  if (cached) {
    console.log("CACHE HIT:", key);
    return cached;
  }

  console.log("CACHE MISS:", key);
  const fresh = await fetchFn();
  cache.set(key, fresh, ttl);
  return fresh;
};

export {
  setCache,
  getCache,
  deleteCache,
  deleteCacheByPrefix,
  flushCache,
  getOrSetCache,
};

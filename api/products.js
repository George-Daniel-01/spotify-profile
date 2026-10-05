const { getActiveProductsWithPrices, requireSupabase, sendError } = require('./_lib');

// Subscription plans shown in the paywall. Cached briefly so the paywall opens
// instantly instead of waiting on two joined Supabase queries.
const CACHE_TTL_MS = 60 * 1000;
let cache = null;

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
    res.setHeader('Cache-Control', 'public, max-age=30');
    return res.status(200).json(cache.data);
  }

  try {
    requireSupabase();
    const products = await getActiveProductsWithPrices();

    // `prices` comes back as a nested relation; the client expects an array.
    const shaped = (products || []).map(p => ({
      ...p,
      prices: Array.isArray(p.prices) ? p.prices : [],
    }));

    cache = { at: Date.now(), data: shaped };
    res.setHeader('Cache-Control', 'public, max-age=30');
    return res.status(200).json(shaped);
  } catch (err) {
    sendError(res, err);
  }
};
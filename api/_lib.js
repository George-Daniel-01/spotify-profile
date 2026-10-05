const stripeLib = require('../server/stripe');
const { supabase, getActiveProductsWithPrices } = require('../server/supabase');

class ConfigError extends Error {}

function requireStripe() {
  if (!stripeLib) throw new ConfigError('STRIPE_SECRET_KEY is not configured');
  return stripeLib;
}

function requireSupabase() {
  if (!supabase) throw new ConfigError('SUPABASE_URL / SUPABASE_SECRET_KEY are not configured');
  return supabase;
}

// Absolute origin of the deployed app, used for Stripe return URLs.
function frontendUri(req) {
  if (process.env.FRONTEND_URI) return process.env.FRONTEND_URI.replace(/\/$/, '');
  const proto = req.headers['x-forwarded-proto'] || 'https';
  return `${proto}://${req.headers.host}`;
}

function sendError(res, err) {
  if (err instanceof ConfigError) {
    // Misconfiguration is our bug, not the caller's: 503 so we notice in logs.
    console.error('[api] configuration error:', err.message);
    res.status(503).json({ error: 'Service not configured' });
    return;
  }
  console.error('[api] error:', err && err.stack ? err.stack : err);
  res.status(500).json({ error: 'Internal server error' });
}

module.exports = {
  stripeLib,
  supabase,
  getActiveProductsWithPrices,
  requireStripe,
  requireSupabase,
  frontendUri,
  sendError,
  ConfigError,
};
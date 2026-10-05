/* eslint-disable no-console */
/**
 * Smoke-tests the Vercel functions in isolation with a fake req/res, asserting
 * they degrade sanely (no 500s, no unhandled rejections) when Stripe/Supabase
 * env vars are absent. No real network calls are made.
 */
const { ConfigError } = require('../api/_lib.js');

function mockRes() {
  const res = {
    statusCode: null,
    body: null,
    headers: {},
    ended: false,
  };
  res.status = c => { res.statusCode = c; return res; };
  res.json = b => { res.body = b; res.ended = true; return res; };
  res.send = b => { res.body = b; res.ended = true; return res; };
  res.setHeader = (k, v) => { res.headers[k] = v; };
  res.redirect = (c, u) => { res.statusCode = c || 302; res.body = u; res.ended = true; return res; };
  return res;
}

function mockReq({ method = 'GET', query = {}, body = {}, headers = {} } = {}) {
  const listeners = {};
  const req = { method, query, body, headers: { host: 'spotify-profile-full.vercel.app', ...headers } };
  req.on = (evt, cb) => { listeners[evt] = cb; return req; };
  req.emitRaw = buf => {
    if (listeners.data) listeners.data(buf);
    if (listeners.end) listeners.end();
  };
  return req;
}

let pass = 0;
let fail = 0;
const check = (name, cond, detail) => {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + ' -> ' + detail); }
};

async function call(modPath, req) {
  delete require.cache[require.resolve(modPath)];
  const mod = require(modPath);
  const res = mockRes();
  await mod(req, res);
  return res;
}

(async () => {
  // Ensure the functions see an unconfigured environment.
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SECRET_KEY;
  delete process.env.STRIPE_WEBHOOK_SECRET;

  console.log('# api/products');
  {
    const res = await call('../api/products.js', mockReq());
    check('GET does not 500 when Supabase unset', res.statusCode !== 500, 'got ' + res.statusCode);
    check('reports service misconfiguration', res.statusCode === 503, 'got ' + res.statusCode + ' body=' + JSON.stringify(res.body));
  }

  console.log('\n# api/subscription-status');
  {
    let res = await call('../api/subscription-status.js', mockReq({ query: {} }));
    check('no user id -> 200 unsubscribed', res.statusCode === 200 && res.body.active === false, JSON.stringify(res.body));

    res = await call('../api/subscription-status.js', mockReq({ query: { spotify_user_id: 'abc' } }));
    check('unconfigured lookup never 500s', res.statusCode === 200, 'got ' + res.statusCode);
    check('returns both field names', 'active' in res.body && 'subscribed' in res.body, JSON.stringify(res.body));
  }

  console.log('\n# api/create-checkout-session');
  {
    let res = await call('../api/create-checkout-session.js', mockReq({ method: 'POST', body: {} }));
    check('unauthenticated -> 401', res.statusCode === 401, 'got ' + res.statusCode);

    res = await call('../api/create-checkout-session.js', mockReq({ method: 'POST', body: { spotify_user_id: 'u1' } }));
    check('missing priceId -> 400', res.statusCode === 400, 'got ' + res.statusCode);

    res = await call('../api/create-checkout-session.js', mockReq({ method: 'POST', body: { spotify_user_id: 'u1', priceId: 'price_1' } }));
    check('unconfigured Stripe -> 503 not 500', res.statusCode === 503, 'got ' + res.statusCode);
  }

  console.log('\n# api/create-portal-link');
  {
    const res = await call('../api/create-portal-link.js', mockReq({ method: 'POST', body: {} }));
    check('unauthenticated -> 401', res.statusCode === 401, 'got ' + res.statusCode);
  }

  console.log('\n# api/webhooks');
  {
    let res = await call('../api/webhooks.js', mockReq({ method: 'GET' }));
    check('GET -> 405', res.statusCode === 405, 'got ' + res.statusCode);

    const req = mockReq({ method: 'POST' });
    const p = call('../api/webhooks.js', req);
    req.emitRaw(Buffer.from('{}'));
    res = await p;
    check('unsigned POST -> 400', res.statusCode === 400, 'got ' + res.statusCode + ' body=' + JSON.stringify(res.body));
  }

  console.log('\n# api/refresh_token');
  {
    let res = await call('../api/refresh_token.js', mockReq({ method: 'GET', query: { refresh_token: 'secret' } }));
    check('GET rejected so tokens stay out of URLs', res.statusCode === 405, 'got ' + res.statusCode);

    res = await call('../api/refresh_token.js', mockReq({ method: 'POST', body: {} }));
    check('missing token -> 400', res.statusCode === 400, 'got ' + res.statusCode);
  }

  console.log('\n# method guards on existing handlers');
  {
    const res = await call('../api/products.js', mockReq({ method: 'POST' }));
    check('products POST -> 405', res.statusCode === 405, 'got ' + res.statusCode);
  }

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('SUITE ERROR:', e); process.exit(1); });
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI || 'http://127.0.0.1:8888/callback';
const FRONTEND_URI = process.env.FRONTEND_URI || 'http://127.0.0.1:8888';
const PORT = process.env.PORT || 8888;

const express = require('express');
const request = require('request');
const cors = require('cors');
const querystring = require('querystring');
const cookieParser = require('cookie-parser');
const history = require('connect-history-api-fallback');
const stripe = require('./stripe');
const {
  createOrRetrieveCustomer,
  manageSubscriptionStatusChange,
  upsertProductRecord,
  upsertPriceRecord,
  getActiveProductsWithPrices,
} = require('./supabase');

const generateRandomString = length => {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

const stateKey = 'spotify_auth_state';
const app = express();

app.use(cors());
app.use(cookieParser());
app.use(express.json());

// --- Spotify OAuth ---

app.get('/login', function (req, res) {
  const state = generateRandomString(16);
  res.cookie(stateKey, state);

  const scope =
    'user-read-private user-read-email user-read-recently-played user-top-read user-follow-read user-follow-modify playlist-read-private playlist-read-collaborative playlist-modify-public streaming user-read-playback-state';

  res.redirect(
    `https://accounts.spotify.com/authorize?${querystring.stringify({
      response_type: 'code',
      client_id: CLIENT_ID,
      scope: scope,
      redirect_uri: REDIRECT_URI,
      state: state,
    })}`,
  );
});

app.get('/callback', function (req, res) {
  const code = req.query.code || null;
  const state = req.query.state || null;
  const storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect(
      `/#${querystring.stringify({ error: 'state_mismatch' })}`,
    );
  } else {
    res.clearCookie(stateKey);
    const authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      },
      headers: {
        Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`,
      },
      json: true,
    };

    request.post(authOptions, function (error, response, body) {
      if (!error && response.statusCode === 200) {
        const access_token = body.access_token;
        const refresh_token = body.refresh_token;

        res.redirect(
          `${FRONTEND_URI}/#${querystring.stringify({
            access_token,
            refresh_token,
          })}`,
        );
      } else {
        res.redirect(
          `/#${querystring.stringify({ error: 'invalid_token' })}`,
        );
      }
    });
  }
});

app.get('/refresh_token', function (req, res) {
  const refresh_token = req.query.refresh_token;
  const authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: {
      Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`,
    },
    form: {
      grant_type: 'refresh_token',
      refresh_token,
    },
    json: true,
  };

  request.post(authOptions, function (error, response, body) {
    if (!error && response.statusCode === 200) {
      const access_token = body.access_token;
      res.send({ access_token });
    }
  });
});

// --- Stripe/Supabase API routes ---

app.get('/products', async function (req, res) {
  try {
    const products = await getActiveProductsWithPrices();
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.get('/subscription-status', async function (req, res) {
  const { spotify_user_id } = req.query;
  if (!spotify_user_id) {
    return res.json({ subscribed: false });
  }
  try {
    const { supabase } = require('./supabase');
    const { data, error } = await supabase
      .from('subscriptions')
      .select('id, status')
      .eq('user_id', spotify_user_id)
      .in('status', ['trialing', 'active'])
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    res.json({ subscribed: !!data });
  } catch (error) {
    console.error('Error checking subscription:', error);
    res.json({ subscribed: false });
  }
});

app.post('/create-checkout-session', async function (req, res) {
  const { price, spotify_user_id, spotify_user_email } = req.body;
  try {
    if (!spotify_user_id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const customer = await createOrRetrieveCustomer({
      uuid: spotify_user_id,
      email: spotify_user_email || '',
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      billing_address_collection: 'required',
      customer,
      line_items: [
        {
          price: price.id,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      allow_promotion_codes: true,
      subscription_data: {
        trial_from_plan: true,
      },
      success_url: `${FRONTEND_URI}/#subscription_success`,
      cancel_url: `${FRONTEND_URI}/#subscription_cancel`,
    });

    res.json({ sessionId: session.id });
  } catch (error) {
    console.error('Checkout session error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

app.post('/create-portal-link', async function (req, res) {
  const { spotify_user_id } = req.body;
  try {
    if (!spotify_user_id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { supabase } = require('./supabase');
    const { data: customerData } = await supabase
      .from('customers')
      .select('stripe_customer_id')
      .eq('id', spotify_user_id)
      .single();

    if (!customerData?.stripe_customer_id) {
      return res.status(404).json({ error: 'No customer found' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerData.stripe_customer_id,
      return_url: `${FRONTEND_URI}/`,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Portal link error:', error);
    res.status(500).json({ error: 'Failed to create portal link' });
  }
});

app.post('/webhooks', express.raw({ type: 'application/json' }), async function (req, res) {
  const body = req.body;
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    if (!sig || !webhookSecret) return res.status(400).send('Missing signature');
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (error) {
    console.log(`Webhook signature verification failed: ${error.message}`);
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  const relevantEvents = new Set([
    'product.created',
    'product.updated',
    'price.created',
    'price.updated',
    'checkout.session.completed',
    'customer.subscription.created',
    'customer.subscription.updated',
    'customer.subscription.deleted',
  ]);

  if (relevantEvents.has(event.type)) {
    try {
      switch (event.type) {
        case 'product.created':
        case 'product.updated':
          await upsertProductRecord(event.data.object);
          break;
        case 'price.created':
        case 'price.updated':
          await upsertPriceRecord(event.data.object);
          break;
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted': {
          const subscription = event.data.object;
          if (!subscription.id || !subscription.customer) {
            throw new Error('Missing subscription ID or customer ID');
          }
          await manageSubscriptionStatusChange(
            subscription.id,
            subscription.customer.toString(),
            event.type === 'customer.subscription.created',
          );
          break;
        }
        case 'checkout.session.completed': {
          const checkoutSession = event.data.object;
          if (checkoutSession.mode === 'subscription') {
            const subscriptionId = checkoutSession.subscription;
            const customerId = checkoutSession.customer;
            if (!subscriptionId || !customerId) {
              throw new Error('Missing subscription or customer ID in checkout session');
            }
            await manageSubscriptionStatusChange(subscriptionId, customerId, true);
          }
          break;
        }
        default:
          throw new Error('Unhandled relevant event');
      }
    } catch (error) {
      console.error('Webhook handler error:', error);
      return res.status(400).json({ error: 'Webhook handler error' });
    }
  }

  res.json({ received: true });
});

// --- Static files & SPA fallback ---

app.use(
  history({
    verbose: true,
    rewrites: [
      { from: /\/login/, to: '/login' },
      { from: /\/callback/, to: '/callback' },
      { from: /\/refresh_token/, to: '/refresh_token' },
      { from: /\/subscription-status/, to: '/subscription-status' },
      { from: /\/products/, to: '/products' },
    ],
  }),
);

app.use(express.static(path.resolve(__dirname, '../client/build')));

app.get('*', function (req, res) {
  res.sendFile(path.resolve(__dirname, '../client/build', 'index.html'));
});

app.listen(PORT, function () {
  console.log(`Server running on http://127.0.0.1:${PORT}`);
});

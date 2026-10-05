const { requireStripe, requireSupabase, sendError } = require('./_lib');

// Stripe signature verification needs the exact raw bytes, so parse the body here
// rather than letting the platform deserialize JSON first.
function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const signature = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  const raw = await readRawBody(req);
  try {
    if (!signature || !webhookSecret) {
      return res.status(400).json({ error: 'Missing signature or webhook secret' });
    }
    const stripe = requireStripe();
    event = stripe.webhooks.constructEvent(raw, signature, webhookSecret);
  } catch (err) {
    console.error('[webhook] signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  const { manageSubscriptionStatusChange, upsertProductRecord, upsertPriceRecord } =
    require('../server/supabase');

  try {
    requireSupabase();
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
        const sub = event.data.object;
        if (!sub.id || !sub.customer) throw new Error('Missing subscription or customer id');
        await manageSubscriptionStatusChange(
          sub.id,
          sub.customer.toString(),
          event.type === 'customer.subscription.created',
        );
        break;
      }
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.mode === 'subscription' && session.subscription && session.customer) {
          await manageSubscriptionStatusChange(
            session.subscription.toString(),
            session.customer.toString(),
            true,
          );
        }
        break;
      }
      default:
        // Unhandled event types are acknowledged, not retried forever.
        return res.status(200).json({ received: true, handled: false });
    }
  } catch (err) {
    console.error('[webhook] handler error:', err.message);
    return res.status(500).json({ error: 'Webhook handler error' });
  }

  return res.status(200).json({ received: true, handled: true });
};
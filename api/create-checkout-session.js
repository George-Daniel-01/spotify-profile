const {
  requireStripe,
  requireSupabase,
  frontendUri,
  sendError,
} = require('./_lib');

/**
 * Stripe.js v9 removed `redirectToCheckout`. The server creates the session and
 * returns a hosted `url` that the browser navigates to directly.
 */
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { priceId, spotify_user_id: spotifyUserId, spotify_user_email: spotifyUserEmail } =
    req.body || {};

  if (!spotifyUserId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }
  if (!priceId) {
    return res.status(400).json({ error: 'Missing priceId' });
  }

  try {
    const stripe = requireStripe();
    const supabase = requireSupabase();

    // Never trust the price the browser sends. Look the price up server-side and
    // only allow plans that are marked active in our own database.
    const { data: price, error: priceError } = await supabase
      .from('prices')
      .select('id, active')
      .eq('id', priceId)
      .maybeSingle();

    if (priceError) throw priceError;
    if (!price || !price.active) {
      return res.status(400).json({ error: 'Unknown or inactive price' });
    }

    // Resolve (or create) the Stripe customer for this Spotify user.
    const { createOrRetrieveCustomer } = require('../server/supabase');
    const customer = await createOrRetrieveCustomer({
      uuid: spotifyUserId,
      email: spotifyUserEmail || '',
    });

    const front = frontendUri(req);
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      billing_address_collection: 'required',
      customer,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      allow_promotion_codes: true,
      client_reference_id: spotifyUserId,
      metadata: { spotifyUUID: spotifyUserId },
      subscription_data: { metadata: { spotifyUUID: spotifyUserId } },
      success_url: `${front}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${front}/?checkout=cancelled`,
    });

    return res.status(200).json({ sessionId: session.id, url: session.url });
  } catch (err) {
    sendError(res, err);
  }
};
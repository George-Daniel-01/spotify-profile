const { requireStripe, requireSupabase, frontendUri, sendError } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { spotify_user_id: spotifyUserId } = req.body || {};
  if (!spotifyUserId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  try {
    const stripe = requireStripe();
    const supabase = requireSupabase();

    const { data, error } = await supabase
      .from('customers')
      .select('stripe_customer_id')
      .eq('id', spotifyUserId)
      .maybeSingle();
    if (error) throw error;

    if (!data || !data.stripe_customer_id) {
      return res.status(404).json({ error: 'No customer found' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: data.stripe_customer_id,
      return_url: `${frontendUri(req)}/`,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    sendError(res, err);
  }
};
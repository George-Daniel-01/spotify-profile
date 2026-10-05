const { requireSupabase, sendError } = require('./_lib');

// Returns both `subscribed` and `active` because the client reads `active`
// while the legacy Express handler returned `subscribed`.
module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const spotifyUserId = req.query.spotify_user_id;
  if (!spotifyUserId) {
    return res.status(200).json({ subscribed: false, active: false });
  }

  try {
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from('subscriptions')
      .select('id, status')
      .eq('user_id', spotifyUserId)
      .in('status', ['trialing', 'active'])
      .limit(1)
      .maybeSingle();
    if (error) throw error;

    const active = !!data;
    return res.status(200).json({ subscribed: active, active });
  } catch (err) {
    // Never fail the whole profile render over a subscription lookup; the
    // paywall showing up is a much better outcome than a broken page.
    console.error('[subscription-status]', err.message);
    return res.status(200).json({ subscribed: false, active: false });
  }
};
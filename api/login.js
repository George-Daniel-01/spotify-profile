const crypto = require('crypto');
const querystring = require('querystring');

module.exports = (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  const scope =
    'user-read-private user-read-email user-read-recently-played user-top-read user-follow-read user-follow-modify playlist-read-private playlist-read-collaborative playlist-modify-public streaming user-read-playback-state';

  const frontendUri = `https://${req.headers.host}`;

  res.setHeader(
    'Set-Cookie',
    `spotify_auth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`,
  );

  res.redirect(
    302,
    `https://accounts.spotify.com/authorize?${querystring.stringify({
      response_type: 'code',
      client_id: process.env.CLIENT_ID,
      scope: scope,
      redirect_uri: process.env.REDIRECT_URI || `${frontendUri}/api/cb`,
      state: state,
    })}`,
  );
};

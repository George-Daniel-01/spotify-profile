const https = require('https');
const querystring = require('querystring');

module.exports = async (req, res) => {
  const { code, state } = req.query;

  const cookies = {};
  (req.headers.cookie || '').split(';').forEach(c => {
    const [key, ...val] = c.trim().split('=');
    cookies[key] = val.join('=');
  });
  const storedState = cookies.spotify_auth_state;

  if (!state || state !== storedState) {
    res.redirect(302, `/#${querystring.stringify({ error: 'state_mismatch' })}`);
    return;
  }

  res.setHeader('Set-Cookie', 'spotify_auth_state=; Path=/; Max-Age=0; HttpOnly');

  const frontendUri = `https://${req.headers.host}`;

  try {
    const tokenData = await exchangeCode(code, frontendUri);
    // Deliver the tokens in the URL fragment: it is never sent to the server, so
    // it stays out of access logs, proxy logs and Referer headers.
    res.redirect(
      302,
      `${frontendUri}/#${querystring.stringify({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
      })}`,
    );
  } catch (err) {
    res.redirect(302, `/#${querystring.stringify({ error: 'invalid_token' })}`);
  }
};

function exchangeCode(code, frontendUri) {
  return new Promise((resolve, reject) => {
    const postData = querystring.stringify({
      code,
      redirect_uri: process.env.REDIRECT_URI || `${frontendUri}/api/cb`,
      grant_type: 'authorization_code',
    });

    const options = {
      hostname: 'accounts.spotify.com',
      path: '/api/token',
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${process.env.CLIENT_ID}:${process.env.CLIENT_SECRET}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const request = https.request(options, response => {
      let body = '';
      response.on('data', chunk => (body += chunk));
      response.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (data.access_token) {
            resolve(data);
          } else {
            reject(new Error('No access token'));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    request.on('error', reject);
    request.write(postData);
    request.end();
  });
}

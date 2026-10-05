const https = require('https');
const querystring = require('querystring');

module.exports = async (req, res) => {
  // POST only: the refresh token arrives in a request body so it never lands in
  // access logs, browser history or Referer headers the way a query param did.
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Use POST with a JSON body' });
  }

  const refreshTokenParam = (req.body && req.body.refresh_token) || '';

  if (!refreshTokenParam) {
    return res.status(400).json({ error: 'Missing refresh_token' });
  }

  try {
    const data = await refreshToken(refreshTokenParam);
    res.json({ access_token: data.access_token });
  } catch (err) {
    res.status(500).json({ error: 'Failed to refresh token' });
  }
};

function refreshToken(refreshToken) {
  return new Promise((resolve, reject) => {
    const postData = querystring.stringify({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
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

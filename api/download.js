// api/download.js
// Node.js serverless (Vercel) - CommonJS style
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch'); // aggiungi a package.json su dev se vuoi

// IMPORTANT: set this in Vercel environment variables (Dashboard -> Project -> Environment Variables)
// LINKVERTISE_BEARER = <il tuo "Anti-Bypass" secret / API key che Linkvertise ti ha dato>
// FALLBACK_REDIRECT = https://link-hub.net/1418070/GgH9bAH83ACg  (o la tua Linkvertise landing)
const LINKVERTISE_BEARER = process.env.LINKVERTISE_BEARER;
const FALLBACK_REDIRECT = process.env.FALLBACK_REDIRECT || 'https://link-hub.net/1418070/GgH9bAH83ACg';

module.exports = async (req, res) => {
  try {
    // Expect Linkvertise to redirect here with some token param (name may vary by Linkvertise)
    // Check query params for the token. Many setups use `token` or `lid` or others.
    // YOU MUST CONFIGURE LINKVERTISE to redirect to: https://yourdomain.com/api/download
    // Linkvertise will append its verification params according to their doc (e.g. token).
    const lvToken = req.query.token || req.query.linkvertiseToken || req.query.lvt; // try common names
    const userCode = (req.query.code || '').toUpperCase(); // optional code param you might pass

    if (!LINKVERTISE_BEARER) {
      console.error("Missing LINKVERTISE_BEARER env var");
      return res.status(500).send("Server misconfiguration");
    }

    if (!lvToken) {
      // No token from Linkvertise -> redirect back to Linkvertise (force them to come through LV)
      return res.redirect(FALLBACK_REDIRECT);
    }

    // Call Linkvertise verification endpoint (official Anti-Bypass check).
    // The exact endpoint path may differ slightly depending on your Linkvertise documentation.
    // According to Linkvertise docs typical pattern: call publisher API with authorization.
    // We'll hit a verification endpoint and pass the token in query; adapt if their doc uses a different path.
    const verifyUrl = `https://publisher.linkvertise.com/api/v1/verify?token=${encodeURIComponent(lvToken)}`;

    const lvResp = await fetch(verifyUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${LINKVERTISE_BEARER}`,
        'Accept': 'application/json'
      },
      // timeout not set; Vercel will manage execution time
    });

    if (!lvResp.ok) {
      console.warn('Linkvertise verify returned non-OK', lvResp.status);
      return res.redirect(FALLBACK_REDIRECT);
    }

    const lvJson = await lvResp.json();
    // The shape of lvJson depends on Linkvertise; check documentation for exact property.
    // We'll assume lvJson.success or lvJson.valid indicates validity; fall back to checking fields.
    const isValid = (lvJson && (lvJson.success === true || (lvJson.data && lvJson.data.valid === true)));

    if (!isValid) {
      // token invalid -> redirect to Linkvertise landing
      return res.redirect(FALLBACK_REDIRECT);
    }

    // Optionally: you can check lvJson.data etc. to validate more details (ip, expiry, etc.)
    // Optionally: verify userCode against something (if you passed the code param). Left as optional.

    // Serve the zip file in /public/download/Saturn_X.zip
    const filePath = path.join(__dirname, '..', 'public', 'download', 'Saturn_X.zip');

    if (!fs.existsSync(filePath)) {
      console.error("Requested file not found:", filePath);
      return res.status(404).send("File not found");
    }

    // Stream the file with proper headers
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="Saturn_X.zip"');
    const readStream = fs.createReadStream(filePath);
    readStream.pipe(res);
  } catch (err) {
    console.error('Error in /api/download:', err);
    return res.status(500).send('Server error');
  }
};

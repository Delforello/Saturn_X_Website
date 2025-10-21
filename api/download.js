import fs from 'fs';
import path from 'path';

const LINKVERTISE_BEARER = process.env.LINKVERTISE_SECRET;
const FALLBACK_REDIRECT = process.env.FALLBACK_REDIRECT || 'https://link-hub.net/1418070/GgH9bAH83ACg';

export default async function handler(req, res) {
  try {
    console.log('Parameters received:', req.query);

    const hash = req.query.hash;
    const userCode = (req.query.code || '').toUpperCase();

    // Verifica presenza del token bearer
    if (!LINKVERTISE_BEARER) {
      console.error("LINKVERTISE_BEARER variable missing");
      return res.status(500).send("Server configuration error");
    }

    // Verifica presenza dell'hash
    if (!hash) {
      console.warn('No hash provided for anti-bypassing');
      return res.redirect(302, FALLBACK_REDIRECT);
    }
    const antiBypassUrl = `https://publisher.linkvertise.com/api/v1/anti_bypassing?token=${encodeURIComponent(LINKVERTISE_BEARER)}&hash=${encodeURIComponent(hash)}`;
    console.log('Send request to:', antiBypassUrl);

    const antiResp = await fetch(antiBypassUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LINKVERTISE_BEARER}`,
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const antiText = await antiResp.text();
    console.log('Raw Api response:', antiText);

    if (!antiResp.ok) {
      console.warn('Anti-bypassing check failed:', antiResp.status, antiText);
      return res.redirect(302, FALLBACK_REDIRECT);
    }

    let isValid = false;
    try {
      const antiJson = JSON.parse(antiText);
      isValid = antiJson.status === true;
      console.log('Parsed API response:', antiJson);
    } catch (parseErr) {
      isValid = antiText.trim() === 'TRUE';
      console.log('Api response as a string:', antiText.trim());
    }

    if (!isValid) {
      console.warn('Anti-bypassing check failed:', antiText);
      return res.redirect(302, FALLBACK_REDIRECT);
    }

    console.log('Anti-bypassing check successful!');
    const filePath = path.join(process.cwd(), 'public/download', 'Saturn_X.zip');
    console.log('Attempt to serve the file:', filePath);

    if (!fs.existsSync(filePath)) {
      console.error('File not found:', filePath);
      return res.status(404).send('File not found.');
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="Saturn_X.zip"');
    const readStream = fs.createReadStream(filePath);
    readStream.pipe(res);
    console.log('File served successfully');
  } catch (err) {
    console.error('Errorr /api/download:', err.message, err.stack);
    res.status(500).send('Server error');
  }
}
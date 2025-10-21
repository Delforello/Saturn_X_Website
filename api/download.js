// pages/api/download.js
import fs from 'fs';
import path from 'path';

const LINKVERTISE_BEARER = process.env.LINKVERTISE_SECRET;
const FALLBACK_REDIRECT = process.env.FALLBACK_REDIRECT || 'https://link-hub.net/1418070/GgH9bAH83ACg';

export default async function handler(req, res) {
  try {
    const lvToken = req.query.token || req.query.linkvertiseToken || req.query.lvt;
    const userCode = (req.query.code || '').toUpperCase();

    if (!LINKVERTISE_BEARER) {
      console.error("❌ Missing LINKVERTISE_BEARER env var");
      return res.status(500).send("Server misconfiguration");
    }

    if (!lvToken) {
      return res.redirect(FALLBACK_REDIRECT);
    }

    const verifyUrl = `https://publisher.linkvertise.com/api/v1/verify?token=${encodeURIComponent(lvToken)}`;
    const lvResp = await fetch(verifyUrl, {
      headers: {
        'Authorization': `Bearer ${LINKVERTISE_BEARER}`,
        'Accept': 'application/json'
      }
    });

    if (!lvResp.ok) {
      console.warn('⚠️ Linkvertise verify returned non-OK:', lvResp.status);
      return res.redirect(FALLBACK_REDIRECT);
    }

    const lvJson = await lvResp.json();
    const isValid = lvJson?.success === true || lvJson?.data?.valid === true;

    if (!isValid) {
      console.warn('❌ Token non valido:', lvJson);
      return res.redirect(FALLBACK_REDIRECT);
    }

    const filePath = path.join(process.cwd(), 'public', 'Saturn_X.zip');

    if (!fs.existsSync(filePath)) {
      console.error("❌ File non trovato:", filePath);
      return res.status(404).send("File not found");
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="Saturn_X.zip"');
    const readStream = fs.createReadStream(filePath);
    readStream.pipe(res);
  } catch (err) {
    console.error('💥 Error in /api/download:', err);
    res.status(500).send('Server error');
  }
}

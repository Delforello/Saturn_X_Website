// pages/api/download.js
import fs from 'fs';
import path from 'path';

const LINKVERTISE_BEARER = process.env.LINKVERTISE_SECRET;
const FALLBACK_REDIRECT = process.env.FALLBACK_REDIRECT || 'https://link-hub.net/1418070/GgH9bAH83ACg';

export default async function handler(req, res) {
  try {
    const lvToken = req.query.token || req.query.linkvertiseToken || req.query.lvt;
    const hash = req.query.hash; // New: Extract hash for anti-bypassing
    const userCode = (req.query.code || '').toUpperCase(); // Unused now, but ready for integration

    if (!LINKVERTISE_BEARER) {
      console.error("❌ Missing LINKVERTISE_BEARER env var");
      return res.status(500).send("Server misconfiguration");
    }

    if (!lvToken) {
      return res.redirect(FALLBACK_REDIRECT);
    }

    // Step 1: Verify Linkvertise token
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

    // Step 2: Verify anti-bypassing hash (if present and enabled)
    if (hash) {
      const antiBypassUrl = `https://publisher.linkvertise.com/api/v1/anti_bypassing?token=${encodeURIComponent(LINKVERTISE_BEARER)}&hash=${encodeURIComponent(hash)}`;
      const antiResp = await fetch(antiBypassUrl, { method: 'POST' });

      if (!antiResp.ok) {
        console.warn('⚠️ Anti-bypassing verify failed:', antiResp.status);
        return res.redirect(FALLBACK_REDIRECT);
      }

      const antiText = await antiResp.text();
      if (antiText.trim() !== 'TRUE') {
        console.warn('❌ Invalid hash:', antiText);
        return res.redirect(FALLBACK_REDIRECT);
      }
    } else {
      // Optional: If anti-bypassing is required, fail if no hash
      console.warn('⚠️ No hash provided for anti-bypassing');
      return res.redirect(FALLBACK_REDIRECT);
    }

    // Optional: Verify user code (if implementing second page)
    // const storedCode = sessionStorage.getItem('downloadVerificationCode'); // Note: SessionStorage is client-side; use cookies or query param
    // if (userCode !== storedCode) {
    //   return res.redirect(FALLBACK_REDIRECT);
    // }

    // Serve the file
    const filePath = path.join(process.cwd(), 'public/download', 'Saturn_X.zip');

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
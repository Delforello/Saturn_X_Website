import fs from 'fs';
import path from 'path';

const LINKVERTISE_BEARER = process.env.LINKVERTISE_SECRET;
const FALLBACK_REDIRECT = process.env.FALLBACK_REDIRECT || 'https://link-hub.net/1418070/GgH9bAH83ACg';

export default async function handler(req, res) {
  try {
    const hash = req.query.hash; // Estraggo il hash dal redirect di Linkvertise
    const userCode = (req.query.code || '').toUpperCase(); // Pronto per futura integrazione

    if (!LINKVERTISE_BEARER) {
      console.error("❌ Variabile d'ambiente LINKVERTISE_BEARER mancante");
      return res.status(500).send("Errore di configurazione del server");
    }

    if (!hash) {
      console.warn('⚠️ Nessun hash fornito per l\'anti-bypassing');
      return res.redirect(302, FALLBACK_REDIRECT);
    }

    // Verifica hash con l'endpoint anti-bypassing
    const antiBypassUrl = `https://publisher.linkvertise.com/api/v1/anti_bypassing?token=${encodeURIComponent(LINKVERTISE_BEARER)}&hash=${encodeURIComponent(hash)}`;
    const antiResp = await fetch(antiBypassUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LINKVERTISE_BEARER}`,
        'Accept': 'text/plain',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!antiResp.ok) {
      console.warn('⚠️ Verifica anti-bypassing fallita:', antiResp.status, await antiResp.text());
      return res.redirect(302, FALLBACK_REDIRECT);
    }

    const antiText = await antiResp.text();
    if (antiText.trim() !== 'TRUE') {
      console.warn('❌ Hash non valido:', antiText);
      return res.redirect(302, FALLBACK_REDIRECT);
    }

    // Opzionale: Verifica codice utente (se implementi pagina intermedia)
    // const storedCode = sessionStorage.getItem('downloadVerificationCode'); // Non funziona server-side
    // if (userCode && userCode !== storedCode) {
    //   console.warn('❌ Codice utente non valido:', userCode);
    //   return res.redirect(302, FALLBACK_REDIRECT);
    // }

    // Servi il file
    const filePath = path.join(process.cwd(), 'public/download', 'Saturn_X.zip');

    if (!fs.existsSync(filePath)) {
      console.error("❌ File non trovato:", filePath);
      return res.status(404).send("File non trovato");
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="Saturn_X.zip"');
    const readStream = fs.createReadStream(filePath);
    readStream.pipe(res);
  } catch (err) {
    console.error('💥 Errore in /api/download:', err.message, err.stack);
    res.status(500).send('Errore del server');
  }
}
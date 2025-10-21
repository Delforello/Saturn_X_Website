import fs from 'fs';
import path from 'path';

const LINKVERTISE_BEARER = process.env.LINKVERTISE_SECRET;
const FALLBACK_REDIRECT = process.env.FALLBACK_REDIRECT || 'https://link-hub.net/1418070/GgH9bAH83ACg';

export default async function handler(req, res) {
  try {
    // Logga i parametri ricevuti per debug
    console.log('📥 Parametri ricevuti:', req.query);

    const hash = req.query.hash; // Hash dal redirect di Linkvertise
    const userCode = (req.query.code || '').toUpperCase(); // Per futura integrazione

    // Verifica presenza del token bearer
    if (!LINKVERTISE_BEARER) {
      console.error("❌ Variabile LINKVERTISE_BEARER mancante");
      return res.status(500).send("Errore di configurazione del server");
    }

    // Verifica presenza dell'hash
    if (!hash) {
      console.warn('⚠️ Nessun hash fornito per l\'anti-bypassing');
      return res.redirect(302, FALLBACK_REDIRECT);
    }

    // Verifica hash tramite API anti-bypassing
    const antiBypassUrl = `https://publisher.linkvertise.com/api/v1/anti_bypassing?token=${encodeURIComponent(LINKVERTISE_BEARER)}&hash=${encodeURIComponent(hash)}`;
    console.log('📤 Invio richiesta a:', antiBypassUrl);

    const antiResp = await fetch(antiBypassUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LINKVERTISE_BEARER}`,
        'Accept': 'application/json',  // Cambiato per favorire JSON
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const antiText = await antiResp.text();
    console.log('📥 Risposta API grezza:', antiText);

    if (!antiResp.ok) {
      console.warn('⚠️ Verifica anti-bypassing fallita:', antiResp.status, antiText);
      return res.redirect(302, FALLBACK_REDIRECT);
    }

    let isValid = false;
    try {
      // Prova a parsare come JSON e verifica status
      const antiJson = JSON.parse(antiText);
      isValid = antiJson.status === true;
      console.log('📥 Risposta API parsata:', antiJson);
    } catch (parseErr) {
      // Fallback a controllo stringa
      isValid = antiText.trim() === 'TRUE';
      console.log('📥 Risposta API come stringa:', antiText.trim());
    }

    if (!isValid) {
      console.warn('❌ Verifica anti-bypassing fallita:', antiText);
      return res.redirect(302, FALLBACK_REDIRECT);
    }

    console.log('✅ Verifica anti-bypassing riuscita!');

    // Opzionale: Verifica codice utente (se implementi pagina intermedia)
    // if (userCode && userCode !== storedCode) {
    //   console.warn('❌ Codice utente non valido:', userCode);
    //   return res.redirect(302, FALLBACK_REDIRECT);
    // }

    // Servi il file
    const filePath = path.join(process.cwd(), 'public/download', 'Saturn_X.zip');
    console.log('📂 Tentativo di servire il file:', filePath);

    if (!fs.existsSync(filePath)) {
      console.error('❌ File non trovato:', filePath);
      return res.status(404).send('File non trovato');
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="Saturn_X.zip"');
    const readStream = fs.createReadStream(filePath);
    readStream.pipe(res);
    console.log('✅ File servito con successo');
  } catch (err) {
    console.error('💥 Errore in /api/download:', err.message, err.stack);
    res.status(500).send('Errore del server');
  }
}
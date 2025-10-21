import { NextResponse } from 'next/server';

// Questa funzione è il "middleware", il nostro buttafuori.
// Vercel la eseguirà automaticamente PRIMA di servire qualsiasi file.
export async function middleware(request) {
  // Controlliamo se l'utente sta cercando di accedere alla cartella /download
  if (request.nextUrl.pathname.startsWith('/download')) {
    
    // 1. Prendiamo l'IP dell'utente
    const userIp = request.ip;

    if (!userIp) {
      // Se non troviamo l'IP, neghiamo l'accesso per sicurezza
      const url = request.nextUrl.clone();
      url.pathname = '/'; // Reindirizza alla home
      return NextResponse.redirect(url);
    }

    // 2. Prepariamo la chiamata all'API di Linkvertise
    const linkvertiseApiUrl = `https://publisher.linkvertise.com/api/v1/user/r?ip=${userIp}`;
    
    // IMPORTANTE: Sostituisci con il tuo token personale!
    const myLinkvertiseToken = ' b227fc9f505658d88c4ee5c0ccbbfbace345e5c17dc75e3592d841bda6a5f819';

    try {
      // 3. Chiamiamo l'API di Linkvertise
      const response = await fetch(linkvertiseApiUrl, {
        headers: { 'linkvertise-api-token': myLinkvertiseToken },
      });
      const data = await response.json();

      // 4. Controlliamo la risposta
      if (data && data.data && data.data.valid === true) {
        // PERMESSO ACCORDATO: L'utente ha passato Linkvertise.
        // NextResponse.next() dice a Vercel: "Ok, procedi e mostra all'utente la pagina che ha chiesto".
        return NextResponse.next();
      }
    } catch (error) {
      console.error('Errore durante la verifica con Linkvertise:', error);
      // In caso di errore, per sicurezza neghiamo l'accesso
    }
    
    // ACCESSO NEGATO: Se arriviamo qui, significa che la verifica è fallita.
    // Reindirizziamo l'utente alla pagina principale.
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  // Se l'utente non sta cercando di accedere a /download, non facciamo nulla.
  return NextResponse.next();
}

export const config = {
  runtime: 'edge',
};
export default async function handler(request) {
  const userIp = request.headers.get('x-forwarded-for')?.split(',')[0].trim();
  if (!userIp) {
    return new Response('Access Denied: Cannot verify your request.', { status: 403 });
  }
  const linkvertiseApiUrl = `https://publisher.linkvertise.com/api/v1/user/r?ip=${userIp}`;
  const myLinkvertiseToken = ' b227fc9f505658d88c4ee5c0ccbbfbace345e5c17dc75e3592d841bda6a5f819';

  try {
    const response = await fetch(linkvertiseApiUrl, {
      headers: {
        'linkvertise-api-token': myLinkvertiseToken,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
       console.error(`Linkvertise API Error: ${response.statusText}`);
       return new Response('Verification failed. Please try again later.', { status: 500 });
    }

    const data = await response.json();
    if (data && data.data && data.data.valid === true) {
      console.log(`Access granted for IP: ${userIp}`);
      return fetch(request);
    } else {
      console.log(`Access denied for IP: ${userIp}`);
      const siteUrl = new URL(request.url).origin;
      return Response.redirect(siteUrl, 302);
    }

  } catch (error) {
    console.error('An unexpected error occurred:', error);
    return new Response('An error occurred during verification.', { status: 500 });
  }
}

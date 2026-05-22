interface TokenResponse {
  token_type: string;
  expires_in: number;
  access_token: string;
}

export interface GraphConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
}

export async function getAccessToken(cfg: GraphConfig): Promise<string> {
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    scope: 'https://graph.microsoft.com/.default',
  });
  const res = await fetch(
    `https://login.microsoftonline.com/${encodeURIComponent(cfg.tenantId)}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Azure token error ${res.status}: ${text}`);
  }
  const json = (await res.json()) as TokenResponse;
  return json.access_token;
}

function encodeShareUrl(url: string): string {
  const utf8 = new TextEncoder().encode(url);
  let binary = '';
  for (const b of utf8) binary += String.fromCharCode(b);
  const b64 = btoa(binary);
  const b64url = b64.replace(/=+$/g, '').replace(/\//g, '_').replace(/\+/g, '-');
  return `u!${b64url}`;
}

export async function downloadSharedFile(
  shareUrl: string,
  accessToken: string,
): Promise<ArrayBuffer> {
  const shareId = encodeShareUrl(shareUrl);
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/shares/${shareId}/driveItem/content`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      redirect: 'follow',
    },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Graph download error ${res.status}: ${text}`);
  }
  return res.arrayBuffer();
}

export interface KvConfig {
  accountId: string;
  namespaceId: string;
  apiToken: string;
}

export async function putKv(
  cfg: KvConfig,
  key: string,
  value: string,
): Promise<void> {
  const url = `https://api.cloudflare.com/client/v4/accounts/${cfg.accountId}/storage/kv/namespaces/${cfg.namespaceId}/values/${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${cfg.apiToken}`,
      'Content-Type': 'text/plain',
    },
    body: value,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Cloudflare KV write error ${res.status}: ${text}`);
  }
}

import type { RpcSettings } from "../store/settingsStore";

export type RpcResult<T = any> = {
  ok: boolean;
  result?: T;
  error?: string;
  raw?: any;
};

let rpcIdCounter = 0;

export async function callBitcoinRpc<T = any>(
  settings: RpcSettings,
  method: string,
  params: any[] = []
): Promise<RpcResult<T>> {
  if (!settings.enabled) {
    return { ok: false, error: "RPC is disabled in settings." };
  }

  const { scheme, host, port, username, password, wallet } = settings;

  const urlBase =
    wallet && wallet.trim().length > 0
      ? `${scheme}://${host}:${port}/wallet/${encodeURIComponent(wallet)}`
      : `${scheme}://${host}:${port}/`;

  const body = {
    jsonrpc: "1.0",
    id: `segop-lab-${rpcIdCounter++}`,
    method,
    params,
  };

  try {
    const resp = await fetch(urlBase, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization:
          "Basic " +
          btoa(`${username || ""}:${password || ""}`),
      },
      body: JSON.stringify(body),
    });

    const text = await resp.text();
    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      return {
        ok: false,
        error: `RPC response is not valid JSON (status ${resp.status})`,
        raw: text,
      };
    }

    if (json.error) {
      return {
        ok: false,
        error: json.error.message || "RPC error",
        raw: json,
      };
    }

    return { ok: true, result: json.result as T, raw: json };
  } catch (e: any) {
    return {
      ok: false,
      error:
        e?.message ||
        "Network / CORS error when calling Bitcoin RPC endpoint.",
    };
  }
}


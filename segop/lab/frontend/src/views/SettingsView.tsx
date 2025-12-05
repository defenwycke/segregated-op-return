import { useState } from "react";
import "./SettingsView.css";
import { useSettingsStore } from "../store/settingsStore";
import { callBitcoinRpc } from "../rpc/bitcoinRpc";

type InfoState = {
  loading: boolean;
  blockchain?: string;
  mempool?: string;
  wallet?: string;
  error?: string;
};

export default function SettingsView() {
  const { rpc, setRpc, resetRpc } = useSettingsStore();
  const [info, setInfo] = useState<InfoState>({ loading: false });

  const handleTest = async () => {
    setInfo({ loading: true });

    const chainRes = await callBitcoinRpc<any>(rpc, "getblockchaininfo", []);
    if (!chainRes.ok) {
      setInfo({
        loading: false,
        error: `getblockchaininfo failed: ${chainRes.error}`,
      });
      return;
    }

    const memRes = await callBitcoinRpc<any>(rpc, "getmempoolinfo", []);
    const walletRes = await callBitcoinRpc<any>(rpc, "getwalletinfo", []);

    const blockchain = JSON.stringify(chainRes.result, null, 2);
    const mempool = memRes.ok
      ? JSON.stringify(memRes.result, null, 2)
      : `Error: ${memRes.error}`;
    const wallet = walletRes.ok
      ? JSON.stringify(walletRes.result, null, 2)
      : `Error: ${walletRes.error}`;

    setInfo({
      loading: false,
      blockchain,
      mempool,
      wallet,
      error: undefined,
    });
  };

  return (
    <div className="settings-root">
      <h2>Settings</h2>
      <p className="settings-intro">
        Configure segOP Lab&apos;s connection to your Bitcoin Ghost / segOP
        regtest node. RPC is optional; if disabled, the Lab runs in
        standalone mode with simulated wallets and transactions.
      </p>

      <div className="settings-card">
        <h3>Node RPC (Bitcoin Core-compatible)</h3>

        <div className="settings-row settings-row-toggle">
          <label>
            <input
              type="checkbox"
              checked={rpc.enabled}
              onChange={(e) => setRpc({ enabled: e.target.checked })}
            />{" "}
            Enable RPC integration
          </label>
          <small>
            When enabled, segOP Lab can query chain state and, in future
            phases, create/broadcast transactions via PSBT.
          </small>
        </div>

        <div className="settings-grid">
          <div className="settings-field">
            <label>Scheme</label>
            <select
              value={rpc.scheme}
              onChange={(e) =>
                setRpc({ scheme: e.target.value as "http" | "https" })
              }
            >
              <option value="http">http</option>
              <option value="https">https</option>
            </select>
          </div>

          <div className="settings-field">
            <label>Host</label>
            <input
              type="text"
              value={rpc.host}
              onChange={(e) => setRpc({ host: e.target.value })}
              placeholder="127.0.0.1"
            />
          </div>

          <div className="settings-field">
            <label>Port</label>
            <input
              type="text"
              value={rpc.port}
              onChange={(e) => setRpc({ port: e.target.value })}
              placeholder="18443"
            />
          </div>

          <div className="settings-field">
            <label>Username</label>
            <input
              type="text"
              value={rpc.username}
              onChange={(e) => setRpc({ username: e.target.value })}
            />
          </div>

          <div className="settings-field">
            <label>Password</label>
            <input
              type="password"
              value={rpc.password}
              onChange={(e) => setRpc({ password: e.target.value })}
            />
          </div>

          <div className="settings-field">
            <label>Wallet name</label>
            <input
              type="text"
              value={rpc.wallet}
              onChange={(e) => setRpc({ wallet: e.target.value })}
              placeholder="(blank for default)"
            />
          </div>
        </div>

        <div className="settings-actions">
          <button type="button" onClick={handleTest} disabled={!rpc.enabled}>
            {info.loading ? "Testing..." : "Test connection"}
          </button>
          <button type="button" onClick={resetRpc}>
            Reset to defaults
          </button>
        </div>
      </div>

      <div className="settings-card">
        <h3>RPC Dashboard</h3>
        <p className="settings-hint">
          Test button calls <code>getblockchaininfo</code>,{" "}
          <code>getmempoolinfo</code>, <code>getwalletinfo</code>. This is
          read-only and helps confirm connectivity.
        </p>

        {info.error && (
          <div className="settings-error">{info.error}</div>
        )}

        <div className="settings-info-grid">
          <div className="settings-info-block">
            <label>Blockchain info</label>
            <pre>
              {info.blockchain ||
                (info.loading
                  ? "Loading..."
                  : "No data yet. Click Test connection.")}
            </pre>
          </div>

          <div className="settings-info-block">
            <label>Mempool info</label>
            <pre>
              {info.mempool ||
                (info.loading
                  ? "Loading..."
                  : "No data yet. Click Test connection.")}
            </pre>
          </div>

          <div className="settings-info-block">
            <label>Wallet info</label>
            <pre>
              {info.wallet ||
                (info.loading
                  ? "Loading..."
                  : "No data yet. Click Test connection.")}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

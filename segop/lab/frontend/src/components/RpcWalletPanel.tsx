import { useState, useEffect } from "react";
import { useSettingsStore } from "../store/settingsStore";
import { callBitcoinRpc } from "../rpc/bitcoinRpc";

type PanelState = {
  loading: boolean;
  wallets: string[];
  activeWallet?: string;
  walletInfo?: string;
  mempoolInfo?: string;
  error?: string;
};

export default function RpcWalletPanel() {
  const { rpc, setRpc } = useSettingsStore();
  const [state, setState] = useState<PanelState>({
    loading: false,
    wallets: [],
  });
  const [newWalletName, setNewWalletName] = useState("segoplab");

  const rpcDisabled = !rpc.enabled;

  const refreshWalletList = async () => {
    if (rpcDisabled) {
      setState((s) => ({
        ...s,
        error: "RPC is disabled in Settings.",
      }));
      return;
    }

    setState((s) => ({ ...s, loading: true, error: undefined }));

    const res = await callBitcoinRpc<string[]>(rpc, "listwallets", []);
    if (!res.ok) {
      setState((s) => ({
        ...s,
        loading: false,
        wallets: [],
        error: `listwallets failed: ${res.error}`,
      }));
      return;
    }

    const wallets = res.result || [];
    setState((s) => ({
      ...s,
      loading: false,
      wallets,
      activeWallet: rpc.wallet || wallets[0],
      error: undefined,
    }));
  };

  const createWallet = async () => {
    if (rpcDisabled) return;
    const name = newWalletName.trim();
    if (!name) {
      setState((s) => ({
        ...s,
        error: "Wallet name cannot be empty.",
      }));
      return;
    }

    setState((s) => ({ ...s, loading: true, error: undefined }));

    const res = await callBitcoinRpc<any>(rpc, "createwallet", [name]);
    if (!res.ok) {
      setState((s) => ({
        ...s,
        loading: false,
        error: `createwallet failed: ${res.error}`,
      }));
      return;
    }

    // Update active wallet in settings + refresh list
    setRpc({ wallet: name });
    await refreshWalletList();
  };

  const loadWallet = async (name: string) => {
    if (rpcDisabled) return;
    setState((s) => ({ ...s, loading: true, error: undefined }));

    const res = await callBitcoinRpc<any>(rpc, "loadwallet", [name]);
    if (!res.ok && !String(res.error).includes("Duplicate")) {
      setState((s) => ({
        ...s,
        loading: false,
        error: `loadwallet failed: ${res.error}`,
      }));
      return;
    }

    setRpc({ wallet: name });
    setState((s) => ({
      ...s,
      loading: false,
      activeWallet: name,
      error: undefined,
    }));
  };

  const unloadWallet = async (name: string) => {
    if (rpcDisabled) return;
    setState((s) => ({ ...s, loading: true, error: undefined }));

    const res = await callBitcoinRpc<any>(rpc, "unloadwallet", [name]);
    if (!res.ok) {
      setState((s) => ({
        ...s,
        loading: false,
        error: `unloadwallet failed: ${res.error}`,
      }));
      return;
    }

    // Clear wallet in settings if we just unloaded the active one
    if (rpc.wallet === name) {
      setRpc({ wallet: "" });
    }
    await refreshWalletList();
  };

  const refreshWalletInfo = async () => {
    if (rpcDisabled) {
      setState((s) => ({
        ...s,
        error: "RPC is disabled in Settings.",
      }));
      return;
    }

    setState((s) => ({ ...s, loading: true, error: undefined }));
    const res = await callBitcoinRpc<any>(rpc, "getwalletinfo", []);
    if (!res.ok) {
      setState((s) => ({
        ...s,
        loading: false,
        walletInfo: undefined,
        error: `getwalletinfo failed: ${res.error}`,
      }));
      return;
    }

    setState((s) => ({
      ...s,
      loading: false,
      walletInfo: JSON.stringify(res.result, null, 2),
      error: undefined,
    }));
  };

  const refreshMempoolInfo = async () => {
    if (rpcDisabled) {
      setState((s) => ({
        ...s,
        error: "RPC is disabled in Settings.",
      }));
      return;
    }

    setState((s) => ({ ...s, loading: true, error: undefined }));
    const res = await callBitcoinRpc<any>(rpc, "getmempoolinfo", []);
    if (!res.ok) {
      setState((s) => ({
        ...s,
        loading: false,
        mempoolInfo: undefined,
        error: `getmempoolinfo failed: ${res.error}`,
      }));
      return;
    }

    setState((s) => ({
      ...s,
      loading: false,
      mempoolInfo: JSON.stringify(res.result, null, 2),
      error: undefined,
    }));
  };

  // On first mount, try to list wallets so the panel isn't empty
  useEffect(() => {
    if (!rpcDisabled) {
      void refreshWalletList();
    }
  }, [rpcDisabled]);

  return (
    <div className="rpcwallet-root">
      <h3>Node wallet &amp; mempool</h3>
      <p className="rpcwallet-intro">
        These controls use the RPC settings to manage wallets on your
        regtest / segOP node. All operations are standard Bitcoin Core RPC
        calls.
      </p>

      {state.error && (
        <div className="rpcwallet-error">{state.error}</div>
      )}

      <div className="rpcwallet-grid">
        <div className="rpcwallet-column">
          <div className="rpcwallet-section">
            <label>Available wallets</label>
            <div className="rpcwallet-walletlist">
              {state.wallets.length === 0 ? (
                <div className="rpcwallet-empty">
                  No wallets listed. Click Refresh wallets.
                </div>
              ) : (
                state.wallets.map((w) => (
                  <div
                    key={w}
                    className={
                      "rpcwallet-walletitem" +
                      (w === state.activeWallet ? " is-active" : "")
                    }
                  >
                    <span>{w}</span>
                    <div className="rpcwallet-walletactions">
                      <button
                        type="button"
                        onClick={() => loadWallet(w)}
                      >
                        Load
                      </button>
                      <button
                        type="button"
                        onClick={() => unloadWallet(w)}
                      >
                        Unload
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="rpcwallet-buttons-row">
              <button
                type="button"
                onClick={refreshWalletList}
                disabled={rpcDisabled}
              >
                Refresh wallets
              </button>
            </div>
          </div>

          <div className="rpcwallet-section">
            <label>Create new wallet</label>
            <div className="rpcwallet-create-row">
              <input
                type="text"
                value={newWalletName}
                onChange={(e) => setNewWalletName(e.target.value)}
                placeholder="segoplab"
              />
              <button
                type="button"
                onClick={createWallet}
                disabled={rpcDisabled}
              >
                Create
              </button>
            </div>
            <small>
              Newly created wallets will be loaded and set as the active
              wallet in Settings.
            </small>
          </div>
        </div>

        <div className="rpcwallet-column">
          <div className="rpcwallet-section">
            <div className="rpcwallet-header-row">
              <label>Wallet info</label>
              <button
                type="button"
                onClick={refreshWalletInfo}
                disabled={rpcDisabled}
              >
                Refresh
              </button>
            </div>
            <pre className="rpcwallet-pre">
              {state.walletInfo ||
                "No wallet info yet. Click Refresh."}
            </pre>
          </div>

          <div className="rpcwallet-section">
            <div className="rpcwallet-header-row">
              <label>Mempool info</label>
              <button
                type="button"
                onClick={refreshMempoolInfo}
                disabled={rpcDisabled}
              >
                Refresh
              </button>
            </div>
            <pre className="rpcwallet-pre">
              {state.mempoolInfo ||
                "No mempool info yet. Click Refresh."}
            </pre>
          </div>
        </div>
      </div>

      {state.loading && (
        <div className="rpcwallet-loading">Working with RPC...</div>
      )}
    </div>
  );
}

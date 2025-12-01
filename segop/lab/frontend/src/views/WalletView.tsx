import { useNavigate } from "react-router-dom";
import "./WalletView.css";
import { useLabStore } from "../store/labStore";

interface InlineWalletCardProps {
  title: string;
  role: "sender" | "receiver";
}

function InlineWalletCard({ title, role }: InlineWalletCardProps) {
  return (
    <div className="wallet-card">
      <div className="wallet-card-header">
        <h3>{title}</h3>
        <span className="wallet-role">
          {role === "sender" ? "Sender" : "Receiver"}
        </span>
      </div>

      <div className="wallet-row">
        <label>Address</label>
        <div className="wallet-mono">bc1qexample{role}</div>
      </div>

      <div className="wallet-row">
        <label>Balance</label>
        <div>0.00000000 BTC</div>
      </div>

      <div className="wallet-actions">
        <button type="button">New address</button>
        <button type="button">Copy address</button>
      </div>
    </div>
  );
}

export default function WalletView() {
  const navigate = useNavigate();
  const { currentPayloadHex, setCurrentPayloadHex } = useLabStore();

  const handleInspectClick = () => {
    const hex = currentPayloadHex.trim();
    setCurrentPayloadHex(hex);
    navigate("/inspector");
  };

  return (
    <div className="wallet-root">
      <h2>Wallet</h2>
      <p style={{ marginBottom: "16px" }}>
        Dual wallets for easy segOP send/receive testing. Later this will
        connect to your segOP node.
      </p>

      <div className="wallet-layout">
        {/* Left: sender wallet */}
        <InlineWalletCard title="Wallet A" role="sender" />

        {/* Right: receiver wallet */}
        <InlineWalletCard title="Wallet B" role="receiver" />

        {/* Middle/right column: transfer + mining controls */}
        <div className="transfer-card">
          <h3>segOP transfer</h3>

          <div className="transfer-row">
            <label>Amount (BTC)</label>
            <input type="text" placeholder="0.00000000" />
          </div>

          <div className="transfer-row">
            <label>segOP payload (hex or TLV)</label>
            <textarea
              placeholder="Paste segOP TLV payload here..."
              value={currentPayloadHex}
              onChange={(e) => setCurrentPayloadHex(e.target.value)}
            />
          </div>

          <div className="transfer-actions">
            <button type="button">Use BUDS template</button>
            <button type="button">Build TLV…</button>
            <button type="button">Send from A → B</button>
            <button type="button">Send from B → A</button>
            <button type="button" onClick={handleInspectClick}>
              Inspect payload
            </button>
          </div>

          <hr style={{ margin: "12px 0", borderColor: "#222" }} />

          <div className="mining-card">
            <h3>Local mining / regtest</h3>

            <div className="transfer-row">
              <label>Blocks to mine</label>
              <input type="number" defaultValue={1} />
            </div>

            <div className="mining-actions">
              <button type="button">Mine to Wallet A</button>
              <button type="button">Mine to Wallet B</button>
              <button type="button">Refresh balances</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

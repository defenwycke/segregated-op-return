import { Route, Routes, Navigate } from "react-router-dom";
import MainLayout from "./layout/MainLayout";

import InfoView from "./views/InfoView";
import WalletView from "./views/WalletView";
import InspectorView from "./views/InspectorView";
import PayloadsView from "./views/PayloadsView";
import SimulatorView from "./views/SimulatorView";
import SettingsView from "./views/SettingsView";
import TestsView from "./views/TestsView";
import "./App.css";

export default function App() {
  return (
    <MainLayout>
      <div className="app-root">
        <div className="app-main">
          <Routes>
            {/* default → /infoview */}
            <Route path="/" element={<Navigate to="/infoview" replace />} />
            <Route path="/infoview" element={<InfoView />} />
            <Route path="/wallet" element={<WalletView />} />
            <Route path="/inspector" element={<InspectorView />} />
            <Route path="/payloads" element={<PayloadsView />} />
            <Route path="/simulator" element={<SimulatorView />} />
            <Route path="/tests" element={<TestsView />} />
            <Route path="/settings" element={<SettingsView />} />
          </Routes>
        </div>

        <footer className="app-footer">
          &lt; D E F E N W Y C K E &gt;
        </footer>
      </div>
    </MainLayout>
  );
}

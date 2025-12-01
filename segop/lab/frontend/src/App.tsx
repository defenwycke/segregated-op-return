import { Route, Routes, Navigate } from "react-router-dom";
import MainLayout from "./layout/MainLayout";

import WalletView from "./views/WalletView";
import InspectorView from "./views/InspectorView";
import PayloadsView from "./views/PayloadsView";
import SimulatorView from "./views/SimulatorView";
import SettingsView from "./views/SettingsView";

export default function App() {
  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/wallet" />} />
        <Route path="/wallet" element={<WalletView />} />
        <Route path="/inspector" element={<InspectorView />} />
        <Route path="/payloads" element={<PayloadsView />} />
        <Route path="/simulator" element={<SimulatorView />} />
        <Route path="/settings" element={<SettingsView />} />
      </Routes>
    </MainLayout>
  );
}

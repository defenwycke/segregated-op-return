import { Link, useLocation } from "react-router-dom";
import "./MainLayout.css";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();

  const tabs = [
    { to: "/wallet", label: "Wallet" },
    { to: "/inspector", label: "Inspector" },
    { to: "/payloads", label: "Payloads" },
    { to: "/simulator", label: "Simulator" },
    { to: "/settings", label: "Settings" },
  ];

  return (
    <div className="layout-root">
      <header className="layout-header">
        <div className="logo">
          segOP<span className="lab">Lab</span>
        </div>

        <nav className="layout-nav">
          {tabs.map((tab) => (
            <Link
              key={tab.to}
              className={pathname === tab.to ? "nav-item active" : "nav-item"}
              to={tab.to}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="layout-main">{children}</main>
    </div>
  );
}

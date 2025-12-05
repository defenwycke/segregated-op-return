import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import "./MainLayout.css";

interface MainLayoutProps {
  children: ReactNode;
}

function navClass(isActive: boolean): string {
  return isActive ? "nav-item active" : "nav-item";
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="layout-root">
      <header className="layout-header">
        <div className="logo">
          seg<span className="lab">OP Lab</span>
        </div>
        <nav className="layout-nav">
          <NavLink
            to="/infoview"
            className={({ isActive }) => navClass(isActive)}
          >
            Info
          </NavLink>
          <NavLink
            to="/wallet"
            className={({ isActive }) => navClass(isActive)}
          >
            Wallet
          </NavLink>
          <NavLink
            to="/inspector"
            className={({ isActive }) => navClass(isActive)}
          >
            Inspector
          </NavLink>
          <NavLink
            to="/payloads"
            className={({ isActive }) => navClass(isActive)}
          >
            Payloads
          </NavLink>
          <NavLink
            to="/simulator"
            className={({ isActive }) => navClass(isActive)}
          >
            Simulator
          </NavLink>
          <NavLink
            to="/tests"
            className={({ isActive }) => navClass(isActive)}
          >
            Tests
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) => navClass(isActive)}
          >
            Settings
          </NavLink>
        </nav>
      </header>

      <main className="layout-main">{children}</main>
    </div>
  );
}

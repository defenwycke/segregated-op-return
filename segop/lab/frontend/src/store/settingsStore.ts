import { create } from "zustand";

export type RpcSettings = {
  enabled: boolean;
  scheme: "http" | "https";
  host: string;      // e.g. 127.0.0.1
  port: string;      // text so we don't fight with number parsing
  username: string;
  password: string;
  wallet: string;    // e.g. "segoplab" or "" for default
};

type SettingsState = {
  rpc: RpcSettings;
  setRpc: (partial: Partial<RpcSettings>) => void;
  resetRpc: () => void;
};

const defaultRpc: RpcSettings = {
  enabled: false,
  scheme: "http",
  host: "127.0.0.1",
  port: "18443", // typical regtest port
  username: "user",
  password: "pass",
  wallet: "",
};

export const useSettingsStore = create<SettingsState>((set) => ({
  rpc: defaultRpc,
  setRpc: (partial: Partial<RpcSettings>) =>
    set((state) => ({ rpc: { ...state.rpc, ...partial } })),
  resetRpc: () => set({ rpc: defaultRpc }),
}));

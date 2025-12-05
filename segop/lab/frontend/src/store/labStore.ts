import { create } from "zustand";

type HeaderPreset = {
  tier?: number;
  typeId?: number;
  appId?: number;
  version?: number;
  notes?: string;
} | null;

type LabState = {
  currentPayloadHex: string;
  setCurrentPayloadHex: (hex: string) => void;

  headerPreset: HeaderPreset;
  setHeaderPreset: (preset: HeaderPreset) => void;
  clearHeaderPreset: () => void;
};

export const useLabStore = create<LabState>((set) => ({
  currentPayloadHex: "",
  setCurrentPayloadHex: (hex: string) => set({ currentPayloadHex: hex }),

  headerPreset: null,
  setHeaderPreset: (preset: HeaderPreset) => set({ headerPreset: preset }),
  clearHeaderPreset: () => set({ headerPreset: null }),
}));

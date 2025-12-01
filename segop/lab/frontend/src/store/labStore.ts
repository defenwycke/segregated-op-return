import { create } from "zustand";

export const useLabStore = create((set) => ({
  currentPayloadHex: "",
  setCurrentPayloadHex: (hex: string) => set({ currentPayloadHex: hex }),

  // New: BUDS header preset for the builder
  headerPreset: null as any,
  setHeaderPreset: (preset: any) => set({ headerPreset: preset }),
  clearHeaderPreset: () => set({ headerPreset: null }),
}));

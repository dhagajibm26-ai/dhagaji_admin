import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import type { CutType } from "@/types";

// ─── DENA item types ──────────────────────────────────────────────────────────

export interface BangleDenaItem {
  type: "bangle";
  banglesStockId: string;
  size: string;
  cutType: CutType;
  cuts: number;
  pieces: number;
}

export interface ThreadDenaItem {
  type: "thread";
  threadStockId: string;
  threadCode: string;
  threadColour: string;
  grams: number;
}

export interface GlueDenaItem {
  type: "glue";
  glueStockId: string;
  itemName: string;
  units: number;
}

export type DenaItem = BangleDenaItem | ThreadDenaItem | GlueDenaItem;

// ─── Store state ──────────────────────────────────────────────────────────────

interface WorkOrderDraftState {
  step: 1 | 2 | 3;
  workerId: string | null;
  workerName: string;
  date: string;
  workType: string;
  perPieceRate: number;
  denaItems: DenaItem[];

  // Actions
  setStep: (step: 1 | 2 | 3) => void;
  nextStep: () => void;
  prevStep: () => void;
  setWorkerId: (id: string, name: string) => void;
  setDate: (date: string) => void;
  setWorkType: (wt: string) => void;
  setPerPieceRate: (rate: number) => void;
  addDenaItem: (item: DenaItem) => void;
  removeDenaItem: (index: number) => void;
  updateDenaItem: (index: number, item: DenaItem) => void;
  reset: () => void;
}

const initialState = {
  step: 1 as const,
  workerId: null,
  workerName: "",
  date: new Date().toISOString().slice(0, 10),
  workType: "",
  perPieceRate: 0,
  denaItems: [] as DenaItem[],
};

export const useWorkOrderStore = create<WorkOrderDraftState>()((set, get) => ({
  ...initialState,

  setStep: (step) => set({ step }),
  nextStep: () => {
    const { step } = get();
    if (step < 3) set({ step: (step + 1) as 1 | 2 | 3 });
  },
  prevStep: () => {
    const { step } = get();
    if (step > 1) set({ step: (step - 1) as 1 | 2 | 3 });
  },
  setWorkerId: (id, name) => set({ workerId: id, workerName: name }),
  setDate: (date) => set({ date }),
  setWorkType: (workType) => set({ workType }),
  setPerPieceRate: (perPieceRate) => set({ perPieceRate }),
  addDenaItem: (item) => set((s) => ({ denaItems: [...s.denaItems, item] })),
  removeDenaItem: (index) =>
    set((s) => ({ denaItems: s.denaItems.filter((_, i) => i !== index) })),
  updateDenaItem: (index, item) =>
    set((s) => ({
      denaItems: s.denaItems.map((d, i) => (i === index ? item : d)),
    })),
  reset: () => set({ ...initialState, date: new Date().toISOString().slice(0, 10) }),
}));

// ─── Individual selectors (Zustand v5 best practice) ─────────────────────────

export const useWorkOrderStep = () => useWorkOrderStore((s) => s.step);
export const useWorkOrderWorkerId = () => useWorkOrderStore((s) => s.workerId);
export const useWorkOrderWorkerName = () => useWorkOrderStore((s) => s.workerName);
export const useWorkOrderDate = () => useWorkOrderStore((s) => s.date);
export const useWorkOrderWorkType = () => useWorkOrderStore((s) => s.workType);
export const useWorkOrderPerPieceRate = () => useWorkOrderStore((s) => s.perPieceRate);
export const useWorkOrderDenaItems = () => useWorkOrderStore((s) => s.denaItems);
export const useWorkOrderActions = () =>
  useWorkOrderStore(useShallow((s) => ({
    setStep: s.setStep,
    nextStep: s.nextStep,
    prevStep: s.prevStep,
    setWorkerId: s.setWorkerId,
    setDate: s.setDate,
    setWorkType: s.setWorkType,
    setPerPieceRate: s.setPerPieceRate,
    addDenaItem: s.addDenaItem,
    removeDenaItem: s.removeDenaItem,
    updateDenaItem: s.updateDenaItem,
    reset: s.reset,
  })));

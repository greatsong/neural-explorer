import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AdminWeights {
  w: [number, number, number, number];
  cutoff: number;
}

interface AdminState {
  selected: 'A' | 'B' | null;
  weights: { A?: AdminWeights; B?: AdminWeights };
  setSelected: (id: 'A' | 'B' | null) => void;
  setWeights: (id: 'A' | 'B', wts: AdminWeights) => void;
}

export const useAdmissions = create<AdminState>()(
  persist(
    (set) => ({
      selected: null,
      weights: {},
      setSelected: (id) => set({ selected: id }),
      setWeights: (id, wts) =>
        set((s) => ({ weights: { ...s.weights, [id]: wts } })),
    }),
    { name: 'neural-explorer-admissions' }
  )
);

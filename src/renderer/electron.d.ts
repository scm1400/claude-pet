declare module '*.png' {
  const src: string;
  export default src;
}

import { MamaState, MamaSettings } from '../shared/types';

declare global {
  interface Window {
    electronAPI: {
      onMamaStateUpdate: (callback: (state: MamaState) => void) => () => void;
      getMamaState: () => Promise<MamaState | null>;
      getSettings: () => Promise<MamaSettings>;
      setSettings: (settings: Partial<MamaSettings>) => Promise<MamaSettings>;
      showSettings: () => void;
      getCollection(): Promise<unknown>;
      onCollectionUpdated(callback: (state: unknown) => void): () => void;
      shareCard(quoteId?: string): Promise<unknown>;
    };
  }
}

export {};

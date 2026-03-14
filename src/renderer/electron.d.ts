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
      setIgnoreMouse(ignore: boolean): void;
      savePosition(x: number, y: number): void;
      moveWindow(x: number, y: number): void;
      showContextMenu(): void;
      getBadges(): Promise<unknown>;
      onBadgeUnlocked(callback: (badgeIds: string[]) => void): () => void;
      uploadSkin(mood?: string): Promise<string | null>;
      resetSkin(): Promise<unknown>;
      getSkinConfig(): Promise<unknown>;
      getDailyHistory(): Promise<unknown>;
    };
  }
}

export {};

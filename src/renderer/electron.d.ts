declare module '*.png' {
  const src: string;
  export default src;
}

import { PetState, PetSettings, SkinUploadResponse } from '../shared/types';

declare global {
  interface Window {
    electronAPI: {
      onPetStateUpdate: (callback: (state: PetState) => void) => () => void;
      getPetState: () => Promise<PetState | null>;
      getSettings: () => Promise<PetSettings>;
      setSettings: (settings: Partial<PetSettings>) => Promise<PetSettings>;
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
      uploadSkin(mood?: string): Promise<SkinUploadResponse>;
      resetSkin(): Promise<unknown>;
      getSkinConfig(): Promise<unknown>;
      onSkinConfigUpdated(callback: (config: unknown) => void): () => void;
      getDailyHistory(): Promise<unknown>;
    };
  }
}

export {};

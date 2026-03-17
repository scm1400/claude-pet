import { useEffect, useRef, useState } from 'react';
import { PetState, PetMood, PetErrorExpression } from '../../shared/types';
import { MESSAGE_POOLS } from '../../core/pet-messages';

type Expression = PetMood | PetErrorExpression;

const DEBUG_UTILIZATION: Record<Expression, number> = {
  happy: 65, playful: 80, sleepy: 20, worried: 40, bored: 10, confused: 0, sleeping: 0,
};

export function usePetState(): PetState | null {
  const [state, setState] = useState<PetState | null>(null);
  const realStateRef = useRef<PetState | null>(null);

  useEffect(() => {
    const cleanup = window.electronAPI.onPetStateUpdate((newState: PetState) => {
      realStateRef.current = newState;
      setState(newState);
    });

    // Expose debug helper in dev mode
    if (process.env.NODE_ENV !== 'production') {
      const moods = Object.keys(DEBUG_UTILIZATION).join(', ');

      (window as any).setMood = async (mood: Expression) => {
        if (!(mood in DEBUG_UTILIZATION)) {
          console.warn(`Unknown mood: "${mood}". Available: ${moods}`);
          return;
        }
        const settings = await window.electronAPI.getSettings() as { locale?: string };
        const locale = (settings?.locale ?? 'ko') as import('../../shared/types').Locale;
        const pool = MESSAGE_POOLS[locale]?.[mood as keyof typeof MESSAGE_POOLS[typeof locale]] ?? MESSAGE_POOLS.en[mood as keyof typeof MESSAGE_POOLS['en']];
        const message = `[DEBUG] ${pool[Math.floor(Math.random() * pool.length)]}`;
        const base = realStateRef.current ?? {
          mood: 'sleeping', utilizationPercent: 0, fiveHourPercent: null,
          message: '', resetsAt: null, fiveHourResetsAt: null,
          dataSource: 'api' as const, stale: false, rateLimited: false, error: null,
        };
        setState({ ...base, mood, utilizationPercent: DEBUG_UTILIZATION[mood], message });
        console.log(`🎭 Mood set to: ${mood} (${locale})`);
      };

      (window as any).resetMood = () => {
        if (realStateRef.current) {
          setState(realStateRef.current);
          console.log('🔄 Mood reset to real state');
        }
      };

      console.log(`🐛 Debug: setMood(${moods}) / resetMood()`);
    }

    return cleanup;
  }, []);

  return state;
}

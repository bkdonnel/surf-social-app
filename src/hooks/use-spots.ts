import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';

export type SpotOption = {
  key: string; // `spot:<id>` or `custom:<id>` — stable identifier across both tables
  id: string;
  kind: 'spot' | 'custom';
  name: string;
  latitude: number;
  longitude: number;
};

export function useSpots() {
  const { session } = useAuth();
  const [spots, setSpots] = useState<SpotOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError(null);

    const [sharedResult, customResult] = await Promise.all([
      supabase.from('spots').select('*').order('name'),
      supabase
        .from('custom_spots')
        .select('*')
        .eq('owner_id', session.user.id)
        .order('created_at', { ascending: false }),
    ]);

    if (sharedResult.error) setError(sharedResult.error.message);
    if (customResult.error) setError(customResult.error.message);

    const shared: SpotOption[] = (sharedResult.data ?? []).map((s) => ({
      key: `spot:${s.id}`,
      id: s.id,
      kind: 'spot',
      name: s.name,
      latitude: s.latitude,
      longitude: s.longitude,
    }));

    const custom: SpotOption[] = (customResult.data ?? []).map((s) => ({
      key: `custom:${s.id}`,
      id: s.id,
      kind: 'custom',
      name: s.name ?? `Custom spot (${s.latitude.toFixed(3)}, ${s.longitude.toFixed(3)})`,
      latitude: s.latitude,
      longitude: s.longitude,
    }));

    setSpots([...shared, ...custom]);
    setLoading(false);
  }, [session]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount, not derived state
    refresh();
  }, [refresh]);

  async function addCustomSpot(name: string, latitude: number, longitude: number) {
    if (!session) return { error: 'Not signed in' };
    const { error: insertError } = await supabase.from('custom_spots').insert({
      owner_id: session.user.id,
      name: name || null,
      latitude,
      longitude,
    });
    if (!insertError) await refresh();
    return { error: insertError?.message ?? null };
  }

  return { spots, loading, error, refresh, addCustomSpot };
}

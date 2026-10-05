import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';

export type HomeSpotWithLocation = {
  id: string;
  spotKey: string; // `spot:<id>` or `custom:<id>`, matches SpotOption.key
  name: string;
  latitude: number;
  longitude: number;
};

type HomeSpotRow = {
  id: string;
  spot_id: string | null;
  custom_spot_id: string | null;
  spots: { id: string; name: string; latitude: number; longitude: number } | null;
  custom_spots: { id: string; name: string | null; latitude: number; longitude: number } | null;
};

export function useHomeSpots() {
  const { session } = useAuth();
  const [homeSpots, setHomeSpots] = useState<HomeSpotWithLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('home_spots')
      .select('id, spot_id, custom_spot_id, spots(id, name, latitude, longitude), custom_spots(id, name, latitude, longitude)')
      .order('created_at', { ascending: false })
      .returns<HomeSpotRow[]>();

    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    setHomeSpots(
      (data ?? [])
        .map((row) => {
          const location = row.spots ?? row.custom_spots;
          if (!location) return null;
          return {
            id: row.id,
            spotKey: row.spot_id ? `spot:${row.spot_id}` : `custom:${row.custom_spot_id}`,
            name: row.spots?.name ?? row.custom_spots?.name ?? 'Custom location',
            latitude: location.latitude,
            longitude: location.longitude,
          };
        })
        .filter((row): row is HomeSpotWithLocation => row !== null)
    );
    setLoading(false);
  }, [session]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount, not derived state
    refresh();
  }, [refresh]);

  async function addHomeSpot(spotKey: string) {
    if (!session) return { error: 'Not signed in' };
    const [kind, id] = spotKey.split(':');

    const { error: insertError } = await supabase.from('home_spots').insert({
      owner_id: session.user.id,
      spot_id: kind === 'spot' ? id : null,
      custom_spot_id: kind === 'custom' ? id : null,
    });

    if (!insertError) await refresh();
    return { error: insertError?.message ?? null };
  }

  async function removeHomeSpot(id: string) {
    const { error: deleteError } = await supabase.from('home_spots').delete().eq('id', id);
    if (!deleteError) await refresh();
    return { error: deleteError?.message ?? null };
  }

  return { homeSpots, loading, error, addHomeSpot, removeHomeSpot };
}

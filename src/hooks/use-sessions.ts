import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';

export type SessionWithSpot = {
  id: string;
  started_at: string;
  ended_at: string;
  wave_count: number;
  rating: number;
  spotName: string;
};

type SessionRow = {
  id: string;
  started_at: string;
  ended_at: string;
  wave_count: number;
  rating: number;
  spots: { name: string } | null;
  custom_spots: { name: string | null } | null;
};

export function useSessions() {
  const { session } = useAuth();
  const [sessions, setSessions] = useState<SessionWithSpot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('sessions')
      .select('id, started_at, ended_at, wave_count, rating, spots(name), custom_spots(name)')
      .order('started_at', { ascending: false })
      .returns<SessionRow[]>();

    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    setSessions(
      (data ?? []).map((row) => ({
        id: row.id,
        started_at: row.started_at,
        ended_at: row.ended_at,
        wave_count: row.wave_count,
        rating: row.rating,
        spotName: row.spots?.name ?? row.custom_spots?.name ?? 'Custom location',
      }))
    );
    setLoading(false);
  }, [session]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount, not derived state
    refresh();
  }, [refresh]);

  async function addSession(params: {
    spotKey: string; // `spot:<id>` or `custom:<id>`
    startedAt: Date;
    endedAt: Date;
    waveCount: number;
    rating: number;
  }) {
    if (!session) return { error: 'Not signed in' };
    const [kind, id] = params.spotKey.split(':');

    const { error: insertError } = await supabase.from('sessions').insert({
      owner_id: session.user.id,
      spot_id: kind === 'spot' ? id : null,
      custom_spot_id: kind === 'custom' ? id : null,
      started_at: params.startedAt.toISOString(),
      ended_at: params.endedAt.toISOString(),
      wave_count: params.waveCount,
      rating: params.rating,
    });

    if (!insertError) await refresh();
    return { error: insertError?.message ?? null };
  }

  return { sessions, loading, error, refresh, addSession };
}

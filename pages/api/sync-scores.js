export default async function handler(req, res) {
  const { createClient } = await import('@supabase/supabase-js');

  const supabase = createClient(
    'https://tucimcaghqgupmiyurdo.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1Y2ltY2FnaHFndXBtaXl1cmRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1MTM5NDMsImV4cCI6MjA4OTA4OTk0M30.HHV0xpNL0WPUzpto7-EY3-IJ0RDAWJkwX5ZP61WM3uw'
  );

  const RAPIDAPI_KEY = '5fdd386d1cmshe662a9c6668ec23p15d236jsnc2db65f22532';

  function parseScore(val) {
    if (!val || val === '-') return null;
    if (val === 'E') return 0;
    return parseInt(val);
  }

  function parsePosition(val) {
    if (!val || val === '-' || val === 'CUT' || val === 'WD' || val === 'DQ') return 999;
    return parseInt(val.toString().replace('T', '')) || 999;
  }

  try {
    const { data: tournament } = await supabase
      .from('tournaments')
      .select('id, sportradar_id, start_date, end_date, name')
      .eq('status', 'active')
      .single();

    if (!tournament) {
      return res.status(200).json({ message: 'No active tournament' });
    }

    const today = new Date();
    const start = new Date(tournament.start_date);
    const end   = new Date(tournament.end_date);
    end.setDate(end.getDate() + 1);

    if (today < start || today > end) {
      return res.status(200).json({ message: `Outside tournament dates for ${tournament.name}` });
    }

    const response = await fetch(
      `https://live-golf-data.p.rapidapi.com/leaderboard?orgId=1&tournId=${tournament.sportradar_id}&year=2026`,
      { headers: {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': 'live-golf-data.p.rapidapi.com'
      }}
    );

    const data = await response.json();
    const rows = data.leaderboardRows || [];

    const upserts = rows.map(r => ({
      tournament_id: tournament.id,
      golfer_name:   `${r.firstName} ${r.lastName}`,
      position:      parsePosition(r.position),
      total_score:   parseScore(r.total),
      today_score:   parseScore(r.currentRoundScore),
      thru:          r.thru || '-',
      round_1:       parseScore(r.rounds[0]?.scoreToPar),
      round_2:       parseScore(r.rounds[1]?.scoreToPar),
      round_3:       parseScore(r.rounds[2]?.scoreToPar),
      round_4:       parseScore(r.rounds[3]?.scoreToPar),
      tee_time:      r.teeTimeTimestamp?.$date?.$numberLong
                       ? new Date(parseInt(r.teeTimeTimestamp.$date.$numberLong)).toISOString()
                       : null,
      status:        r.status || 'active',
      updated_at:    new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('scores')
      .upsert(upserts, { onConflict: 'tournament_id,golfer_name' });

    if (error) throw error;

    return res.status(200).json({
      message: `Synced ${upserts.length} golfers for ${tournament.name}`,
      count: upserts.length,
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

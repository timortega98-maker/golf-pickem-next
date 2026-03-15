const RAPIDAPI_KEY = '5fdd386d1cmshe662a9c6668ec23p15d236jsnc2db65f22532';
const RAPIDAPI_HOST = 'live-golf-data.p.rapidapi.com';

const headers = {
  'x-rapidapi-key': RAPIDAPI_KEY,
  'x-rapidapi-host': RAPIDAPI_HOST,
};

export async function fetchLeaderboard(tournamentId) {
  const res = await fetch(
    `https://live-golf-data.p.rapidapi.com/leaderboard?orgId=1&tournId=${tournamentId}&year=2025`,
    { headers }
  );
  return res.json();
}

export async function fetchOdds(tournamentId) {
  const res = await fetch(
    `https://live-golf-data.p.rapidapi.com/odds?orgId=1&tournId=${tournamentId}&year=2025`,
    { headers }
  );
  return res.json();
}

export async function fetchSchedule() {
  const res = await fetch(
    `https://live-golf-data.p.rapidapi.com/schedule?orgId=1&year=2025`,
    { headers }
  );
  return res.json();
}

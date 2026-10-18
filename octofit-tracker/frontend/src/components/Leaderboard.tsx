import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type Ranking = { teamName: string; totalPoints: number; rank: number };

async function loadLeaderboard() {
  const result = await getJson<{ leaderboard: Ranking[] }>('/api/leaderboard');
  return result.leaderboard;
}

export default function Leaderboard() {
  return <CapabilityCard
    title="Leaderboard"
    description="Compare team point totals."
    emptyMessage="No leaderboard rankings available."
    load={loadLeaderboard}
    renderItem={(ranking) => <>#{ranking.rank} {ranking.teamName} - {ranking.totalPoints} points</>}
  />;
}

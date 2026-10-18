import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type Team = { name: string; members: string[] };

async function loadTeams() {
  const result = await getJson<{ teams: Team[] }>('/api/teams');
  return result.teams;
}

export default function Teams() {
  return <CapabilityCard
    title="Teams"
    description="Manage teams and members."
    emptyMessage="No teams available."
    load={loadTeams}
    renderItem={(team) => <>{team.name} ({team.members.length} members)</>}
  />;
}

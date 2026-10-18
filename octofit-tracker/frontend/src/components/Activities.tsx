import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type Activity = { type: string; minutes: number; points: number };

async function loadActivities() {
  const result = await getJson<{ activities: Activity[] }>('/api/activities');
  return result.activities;
}

export default function Activities() {
  return <CapabilityCard
    title="Activities"
    description="Track student activity minutes and points."
    emptyMessage="No activities available."
    load={loadActivities}
    renderItem={(activity) => <>{activity.type} - {activity.minutes} minutes - {activity.points} points</>}
  />;
}

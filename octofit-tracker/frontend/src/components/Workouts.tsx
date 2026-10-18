import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type Workout = { title: string; reason: string };

async function loadSuggestions() {
  const userEmail = encodeURIComponent('mona@example.com');
  const result = await getJson<{ suggestions: Workout[] }>(`/api/workouts/suggestions/${userEmail}`);
  return result.suggestions;
}

export default function Workouts() {
  return <CapabilityCard
    title="Workout suggestions"
    description="Recommend workouts from activity patterns."
    emptyMessage="No workout suggestions available."
    load={loadSuggestions}
    renderItem={(workout) => <><strong>{workout.title}</strong>: {workout.reason}</>}
  />;
}

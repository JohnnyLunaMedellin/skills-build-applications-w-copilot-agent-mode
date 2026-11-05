import { useApiResource } from '../api/useApiResource.js';

type WorkoutSuggestion = { title: string; focus: string; minutes?: number; difficulty?: string; reason: string };
type WorkoutResponse = { suggestions: WorkoutSuggestion[] };

export default function Workouts() {
  const userEmail = 'mona@example.com';
  const resource = useApiResource<WorkoutResponse>(`/api/workouts/suggestions/${encodeURIComponent(userEmail)}`);
  return <section><h2 className="h4">Workout suggestions</h2><p>Recommendations based on your fitness goal and recent activity.</p>
    {resource.status === 'loading' && <p role="status">Loading workout suggestions...</p>}
    {resource.status === 'error' && <p role="alert">Unable to load workout suggestions. {resource.message}</p>}
    {resource.status === 'success' && (resource.data.suggestions.length === 0
      ? <p>No workout suggestions yet.</p>
      : <ul>{resource.data.suggestions.map((workout, index) => <li key={`${workout.title}-${index}`}><strong>{workout.title}</strong> ({workout.focus})<p>{workout.reason}</p></li>)}</ul>)}
  </section>;
}

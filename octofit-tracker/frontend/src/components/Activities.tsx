import { useApiResource } from '../api/useApiResource.js';

type Activity = { _id?: string; type: string; minutes: number; points: number };
type ActivityResponse = { activities: Activity[] };

export default function Activities() {
  const resource = useApiResource<ActivityResponse>('/api/activities');
  return <section><h2 className="h4">Activities</h2><p>Track student activity minutes and points.</p>
    {resource.status === 'loading' && <p role="status">Loading activities...</p>}
    {resource.status === 'error' && <p role="alert">Unable to load activities. {resource.message}</p>}
    {resource.status === 'success' && (resource.data.activities.length === 0
      ? <p>No activities yet.</p>
      : <ul>{resource.data.activities.map((activity, index) => <li key={activity._id ?? `${activity.type}-${index}`}>{activity.type}: {activity.minutes} minutes, {activity.points} points</li>)}</ul>)}
  </section>;
}

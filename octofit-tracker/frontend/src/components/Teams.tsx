import { useApiResource } from '../api/useApiResource.js';

type Team = { _id?: string; name: string; mascot: string; members: string[] };
type TeamResponse = { teams: Team[] };

export default function Teams() {
  const resource = useApiResource<TeamResponse>('/api/teams');
  return <section><h2 className="h4">Teams</h2><p>Manage teams and members.</p>
    {resource.status === 'loading' && <p role="status">Loading teams...</p>}
    {resource.status === 'error' && <p role="alert">Unable to load teams. {resource.message}</p>}
    {resource.status === 'success' && (resource.data.teams.length === 0
      ? <p>No teams yet.</p>
      : <ul>{resource.data.teams.map((team, index) => <li key={team._id ?? `${team.name}-${index}`}>{team.name} ({team.mascot}) · {team.members.length} members</li>)}</ul>)}
  </section>;
}

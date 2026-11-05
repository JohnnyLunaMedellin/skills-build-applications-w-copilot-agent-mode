import { Activity, Team, User, Workout } from '../models/index.js';
import { Types } from 'mongoose';

type InputRecord = Record<string, unknown>;

function badRequest(message: string) {
  return Object.assign(new Error(message), { status: 400 });
}

function isRecord(value: unknown): value is InputRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(input: unknown) {
  if (!isRecord(input)) throw badRequest('Activity payload must be an object');
  const { userId, teamId, type, minutes } = input;
  if (typeof userId !== 'string' || !Types.ObjectId.isValid(userId)) throw badRequest('A valid userId is required');
  if (typeof teamId !== 'string' || !Types.ObjectId.isValid(teamId)) throw badRequest('A valid teamId is required');
  if (typeof type !== 'string' || !type.trim()) throw badRequest('Activity type is required');
  if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes < 1) throw badRequest('Minutes must be a positive number');

  const [user, team] = await Promise.all([User.findById(userId), Team.findById(teamId)]);
  if (!user || !team) throw badRequest('Activity user and team must exist');

  return Activity.create({
    user: user._id,
    team: team._id,
    type: type.trim(),
    minutes,
    points: minutes,
    occurredAt: new Date(),
  });
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  if (!isRecord(input)) throw badRequest('Team payload must be an object');
  const { name, mascot } = input;
  const members = input.members ?? [];
  if (typeof name !== 'string' || !name.trim()) throw badRequest('Team name is required');
  if (typeof mascot !== 'string' || !mascot.trim()) throw badRequest('Team mascot is required');
  if (!Array.isArray(members) || members.some((member) => typeof member !== 'string' || !Types.ObjectId.isValid(member))) {
    throw badRequest('Team members must be valid user IDs');
  }

  const uniqueMemberIds = [...new Set(members as string[])];
  const users = await User.find({ _id: { $in: uniqueMemberIds } }).select('_id team');
  if (users.length !== uniqueMemberIds.length) throw badRequest('All team members must exist');

  const team = await Team.create({ name: name.trim(), mascot: mascot.trim(), members: uniqueMemberIds });
  const previousTeamIds = [...new Set(users.flatMap((user) => user.team ? [user.team.toString()] : []))];
  if (previousTeamIds.length) {
    await Team.updateMany({ _id: { $in: previousTeamIds } }, { $pull: { members: { $in: uniqueMemberIds } } });
  }
  if (uniqueMemberIds.length) {
    await User.updateMany({ _id: { $in: uniqueMemberIds } }, { $set: { team: team._id } });
  }
  return team;
}

export async function getLeaderboard() {
  const [teams, totals] = await Promise.all([
    Team.find().lean(),
    Activity.aggregate([{ $group: { _id: '$team', totalPoints: { $sum: '$points' } } }]),
  ]);
  const pointsByTeam = new Map(totals.map((entry) => [entry._id.toString(), entry.totalPoints]));
  return teams
    .map((team) => ({ teamName: team.name, totalPoints: pointsByTeam.get(team._id.toString()) ?? 0 }))
    .sort((left, right) => right.totalPoints - left.totalPoints || left.teamName.localeCompare(right.teamName))
    .map((team, index) => ({ ...team, rank: index + 1 }));
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail.trim().toLowerCase() }).lean();
  if (!user) throw Object.assign(new Error('No user found for that email'), { status: 404 });

  const recentActivity = await Activity.findOne({ user: user._id }).sort({ occurredAt: -1 }).lean();
  const activityFocus: Record<string, string> = {
    cycle: 'endurance',
    run: 'endurance',
    strength: 'strength',
    walk: 'endurance',
    yoga: 'mobility',
  };
  const focus = user.fitnessGoal || (recentActivity ? activityFocus[recentActivity.type.toLowerCase()] : undefined);
  const workouts = await Workout.find().lean();
  return workouts
    .map((workout) => ({
      ...workout,
      reason: workout.focus === focus
        ? `Matches your ${focus} fitness goal.`
        : recentActivity
          ? `Complements your recent ${recentActivity.type} activity.`
          : 'A balanced option for your training routine.',
      matchesFocus: workout.focus === focus,
    }))
    .sort((left, right) => Number(right.matchesFocus) - Number(left.matchesFocus) || left.title.localeCompare(right.title))
    .map(({ matchesFocus: _matchesFocus, ...workout }) => workout);
}

export { User };

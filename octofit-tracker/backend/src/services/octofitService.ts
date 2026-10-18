import mongoose from 'mongoose';
import { Activity, Team, User, Workout } from '../models/index.js';

function badRequest(message: string) {
  return Object.assign(new Error(message), { status: 400 });
}

export async function listActivities() {
  return Activity.find().sort({ occurredAt: -1 }).lean();
}

export async function createActivity(input: unknown) {
  if (!input || typeof input !== 'object') {
    throw badRequest('Activity payload is required.');
  }

  const body = input as Record<string, unknown>;
  const userId = typeof body.userId === 'string' ? body.userId : undefined;
  const teamId = typeof body.teamId === 'string' ? body.teamId : undefined;
  const type = typeof body.type === 'string' ? body.type.trim() : '';
  const minutes = Number(body.minutes);
  const points = Number(body.points);

  if (!userId || !mongoose.isValidObjectId(userId)) {
    throw badRequest('A valid userId is required.');
  }
  if (!teamId || !mongoose.isValidObjectId(teamId)) {
    throw badRequest('A valid teamId is required.');
  }
  if (!type) {
    throw badRequest('Activity type is required.');
  }
  if (!Number.isFinite(minutes) || minutes <= 0) {
    throw badRequest('Activity minutes must be a positive number.');
  }

  const [user, team] = await Promise.all([
    User.findById(userId),
    Team.findById(teamId),
  ]);

  if (!user || !team) {
    throw badRequest('The provided user and team must already exist.');
  }

  const occurredAt = body.occurredAt ? new Date(String(body.occurredAt)) : new Date();
  if (Number.isNaN(occurredAt.getTime())) {
    throw badRequest('A valid occurredAt value is required.');
  }

  const created = await Activity.create({
    user: user._id,
    team: team._id,
    type,
    minutes,
    points: Number.isFinite(points) && points > 0 ? points : Math.max(1, Math.round(minutes)),
    occurredAt,
  });

  return created.toObject();
}

export async function listTeams() {
  return Team.find().sort({ name: 1 }).lean();
}

export async function createTeam(input: unknown) {
  if (!input || typeof input !== 'object') {
    throw badRequest('Team payload is required.');
  }

  const body = input as Record<string, unknown>;
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const mascot = typeof body.mascot === 'string' ? body.mascot.trim() : '';
  const members = Array.isArray(body.members) ? body.members : [];

  if (!name) {
    throw badRequest('Team name is required.');
  }
  if (!mascot) {
    throw badRequest('Team mascot is required.');
  }

  const validMembers = members.map((member) => {
    if (typeof member !== 'string' || !mongoose.isValidObjectId(member)) {
      throw badRequest('Each team member must be a valid ObjectId.');
    }
    return new mongoose.Types.ObjectId(member);
  });

  const created = await Team.create({ name, mascot, members: validMembers });

  if (validMembers.length > 0) {
    await User.updateMany({ _id: { $in: validMembers } }, { $set: { team: created._id } });
  }

  return created.toObject();
}

export async function getLeaderboard() {
  const totals = await Activity.aggregate([
    { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
    { $sort: { totalPoints: -1, _id: 1 } },
  ]);

  if (totals.length === 0) {
    return [];
  }

  const teamIds = totals.map((entry) => entry._id);
  const teams = await Team.find({ _id: { $in: teamIds } }).select('_id name').lean();
  const teamMap = new Map(teams.map((team) => [team._id.toString(), team.name]));

  return totals.map((entry, index) => ({
    teamName: teamMap.get(entry._id.toString()) ?? 'Unknown',
    totalPoints: entry.totalPoints,
    rank: index + 1,
  }));
}

export async function suggestWorkouts(userEmail: string) {
  if (!userEmail || typeof userEmail !== 'string' || !userEmail.includes('@')) {
    throw badRequest('A valid user email is required.');
  }

  const user = await User.findOne({ email: userEmail }).lean();
  if (!user) {
    throw badRequest('User not found.');
  }

  const recentActivities = await Activity.find({ user: user._id }).sort({ occurredAt: -1 }).lean();
  const recentType = recentActivities[0]?.type ?? 'run';
  const goal = typeof user.fitnessGoal === 'string' ? user.fitnessGoal.toLowerCase() : '';

  const focusByType: Record<string, string> = {
    run: 'endurance',
    cycle: 'endurance',
    swim: 'endurance',
    walk: 'mobility',
    strength: 'strength',
    yoga: 'mobility',
    mobility: 'mobility',
  };

  const preferredFocus = focusByType[recentType] ?? (goal === 'strength' || goal === 'endurance' || goal === 'mobility' ? goal : 'endurance');
  const focus = goal && ['strength', 'endurance', 'mobility'].includes(goal) ? goal : preferredFocus;

  const workouts = await Workout.find({ focus }).sort({ minutes: 1 }).lean();

  if (workouts.length === 0) {
    const fallback = await Workout.find().sort({ minutes: 1 }).lean();
    return fallback.slice(0, 3).map((workout) => ({
      ...workout,
      reason: `Suggested based on recent ${recentType} activity and ${goal || 'fitness'} goals.`,
    }));
  }

  return workouts.slice(0, 3).map((workout) => ({
    ...workout,
    reason: `Matches your ${recentType} activity and ${focus} training focus.`,
  }));
}

export { User };

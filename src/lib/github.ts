import { prisma } from "@/lib/db";
import { getGithubToken, updateUserSettings } from "@/lib/settings";

type ContributionDay = { date: string; contributionCount: number };

type GraphQLResponse = {
  data?: {
    viewer?: {
      login: string;
      contributionsCollection?: {
        contributionCalendar?: {
          weeks?: { contributionDays: ContributionDay[] }[];
        };
      };
    };
  };
  errors?: { message: string }[];
};

const GITHUB_GRAPHQL = "https://api.github.com/graphql";
const GITHUB_MAX_RANGE_DAYS = 364;
const GITHUB_FALLBACK_RANGE_DAYS = 300;

const CONTRIBUTIONS_QUERY = `
  query($from: DateTime!, $to: DateTime!) {
    viewer {
      login
      contributionsCollection(from: $from, to: $to) {
        contributionCalendar {
          weeks {
            contributionDays {
              date
              contributionCount
            }
          }
        }
      }
    }
  }
`;

export type GithubSyncResult = { ok: true; login: string | null } | { ok: false; error: string };

export async function syncGithubContributions(userId: string): Promise<GithubSyncResult> {
  const token = await getGithubToken(userId);
  if (!token) {
    return { ok: false, error: "Add a GitHub personal access token in Settings." };
  }

  const fetchContributionWindow = async (days: number) => {
    const to = new Date();
    to.setUTCHours(23, 59, 59, 999);
    const from = new Date(to);
    from.setUTCDate(from.getUTCDate() - days);
    from.setUTCHours(0, 0, 0, 0);

    const body = JSON.stringify({
      query: CONTRIBUTIONS_QUERY,
      variables: { from: from.toISOString(), to: to.toISOString() },
    });

    const res = await fetch(GITHUB_GRAPHQL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body,
    });

    if (!res.ok) return { ok: false as const, error: `GitHub HTTP ${res.status}` };

    const json = (await res.json()) as GraphQLResponse;
    if (json.errors?.length) {
      return { ok: false as const, error: json.errors.map((e) => e.message).join("; ") };
    }
    return { ok: true as const, json };
  };

  let response = await fetchContributionWindow(GITHUB_MAX_RANGE_DAYS);
  if (!response.ok && response.error.includes("must not exceed 1 year")) {
    response = await fetchContributionWindow(GITHUB_FALLBACK_RANGE_DAYS);
  }
  if (!response.ok) {
    return { ok: false, error: response.error };
  }

  const { json } = response;
  const weeks = json.data?.viewer?.contributionsCollection?.contributionCalendar?.weeks;
  const login = json.data?.viewer?.login ?? null;

  if (!weeks?.length) {
    return { ok: false, error: "No contribution data returned." };
  }

  const days: ContributionDay[] = weeks.flatMap((w) => w.contributionDays ?? []);

  await Promise.all(
    days.map((d) =>
      prisma.githubDailyStat.upsert({
        where: { userId_date: { userId, date: d.date.slice(0, 10) } },
        create: { userId, date: d.date.slice(0, 10), commits: d.contributionCount },
        update: { commits: d.contributionCount },
      }),
    ),
  );

  if (login) {
    await updateUserSettings(userId, { githubUsername: login });
  }

  return { ok: true, login };
}

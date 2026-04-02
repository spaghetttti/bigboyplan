import { prisma } from "@/lib/db";
import {
  SETTING_GITHUB_PAT,
  SETTING_GH_LOGIN,
  SETTING_LAST_GH_ERROR,
  SETTING_LAST_GH_SYNC,
  setSetting,
} from "@/lib/settings";

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

export async function syncGithubContributions(): Promise<{ ok: true } | { ok: false; error: string }> {
  const token = await prisma.setting.findUnique({ where: { key: SETTING_GITHUB_PAT } });
  if (!token?.value?.trim()) {
    return { ok: false, error: "Add a GitHub personal access token in Settings." };
  }

  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 400);

  const body = JSON.stringify({
    query: CONTRIBUTIONS_QUERY,
    variables: {
      from: from.toISOString(),
      to: to.toISOString(),
    },
  });

  const res = await fetch(GITHUB_GRAPHQL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token.value.trim()}`,
      "Content-Type": "application/json",
    },
    body,
  });

  if (!res.ok) {
    const msg = `GitHub HTTP ${res.status}`;
    await setSetting(SETTING_LAST_GH_ERROR, msg);
    return { ok: false, error: msg };
  }

  const json = (await res.json()) as GraphQLResponse;
  if (json.errors?.length) {
    const msg = json.errors.map((e) => e.message).join("; ");
    await setSetting(SETTING_LAST_GH_ERROR, msg);
    return { ok: false, error: msg };
  }

  const weeks = json.data?.viewer?.contributionsCollection?.contributionCalendar?.weeks;
  const login = json.data?.viewer?.login;
  if (!weeks?.length) {
    await setSetting(SETTING_LAST_GH_ERROR, "No contribution data returned.");
    return { ok: false, error: "No contribution data returned." };
  }

  const days: ContributionDay[] = [];
  for (const w of weeks) {
    for (const d of w.contributionDays ?? []) {
      days.push(d);
    }
  }

  for (const d of days) {
    const date = d.date.slice(0, 10);
    await prisma.githubDailyStat.upsert({
      where: { date },
      create: { date, commitCount: d.contributionCount },
      update: { commitCount: d.contributionCount },
    });
  }

  await setSetting(SETTING_LAST_GH_SYNC, new Date().toISOString());
  await setSetting(SETTING_LAST_GH_ERROR, "");
  if (login) await setSetting(SETTING_GH_LOGIN, login);

  return { ok: true };
}

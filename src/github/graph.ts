/**
 * Shape of GitHub's contribution calendar, as returned by the GraphQL
 * `contributionsCollection.contributionCalendar` field.
 */
export interface ContributionDay {
  date: string; // ISO date, e.g. "2026-07-23"
  count: number;
}

export interface ContributionGrid {
  /** Outer array = weeks (Sunday-start), inner array = the 7 days of that week. */
  weeks: ContributionDay[][];
}

interface GraphQLDay {
  date: string;
  contributionCount: number;
}

interface GraphQLWeek {
  contributionDays: GraphQLDay[];
}

interface GraphQLResponse {
  data?: {
    user?: {
      contributionsCollection?: {
        contributionCalendar?: {
          weeks: GraphQLWeek[];
        };
      };
    };
  };
  errors?: Array<{ message: string }>;
}

const QUERY = `
  query($login: String!) {
    user(login: $login) {
      contributionsCollection {
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

export class GitHubFetchError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "GitHubFetchError";
  }
}

/**
 * Fetches a user's public contribution calendar via GitHub's GraphQL API.
 *
 * `token` needs at minimum `read:user` scope. The default `GITHUB_TOKEN`
 * provided to a workflow run is sufficient for a user's own PUBLIC
 * contributions; private-repo contributions only count toward the
 * calendar if the querying token has access to those repos AND the user's
 * profile setting "Include private contributions" is enabled — this is a
 * GitHub account setting, not something this Action can override, and is
 * a known/documented limitation (see architecture doc §10).
 */
export async function fetchContributionGrid(login: string, token: string): Promise<ContributionGrid> {
  if (!login) throw new GitHubFetchError("fetchContributionGrid: `login` is required");
  if (!token) throw new GitHubFetchError("fetchContributionGrid: `token` is required");

  let res: Response;
  try {
    res = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "contrib-blaster-action",
      },
      body: JSON.stringify({ query: QUERY, variables: { login } }),
    });
  } catch (err) {
    throw new GitHubFetchError(
      `Network error contacting GitHub GraphQL API: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (!res.ok) {
    const bodyText = await safeReadText(res);
    throw new GitHubFetchError(
      `GitHub GraphQL API returned ${res.status} ${res.statusText}: ${bodyText}`,
      res.status,
    );
  }

  const json = (await res.json()) as GraphQLResponse;

  if (json.errors && json.errors.length > 0) {
    throw new GitHubFetchError(`GitHub GraphQL API error: ${json.errors.map((e) => e.message).join("; ")}`);
  }

  const weeks = json.data?.user?.contributionsCollection?.contributionCalendar?.weeks;
  if (!weeks) {
    throw new GitHubFetchError(
      `GitHub GraphQL API response missing expected contribution calendar data for login "${login}". ` +
        `Double-check the login is correct and the token has read access.`,
    );
  }

  return normalizeGraphQLWeeks(weeks);
}

function normalizeGraphQLWeeks(weeks: GraphQLWeek[]): ContributionGrid {
  return {
    weeks: weeks.map((week) =>
      week.contributionDays.map((day) => ({
        date: day.date,
        count: day.contributionCount,
      })),
    ),
  };
}

async function safeReadText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "(no response body)";
  }
}

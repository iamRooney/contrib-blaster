import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchContributionGrid, GitHubFetchError } from "../../src/github/graph.js";

function mockFetchOnce(response: Partial<Response> & { json?: () => Promise<unknown> }) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    statusText: "OK",
    text: async () => "",
    ...response,
  }) as unknown as typeof fetch;
}

describe("fetchContributionGrid", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("throws if login is missing", async () => {
    await expect(fetchContributionGrid("", "token")).rejects.toThrow(GitHubFetchError);
  });

  it("throws if token is missing", async () => {
    await expect(fetchContributionGrid("octocat", "")).rejects.toThrow(GitHubFetchError);
  });

  it("parses a successful response into weeks/days", async () => {
    mockFetchOnce({
      json: async () => ({
        data: {
          user: {
            contributionsCollection: {
              contributionCalendar: {
                weeks: [
                  {
                    contributionDays: [
                      { date: "2026-01-01", contributionCount: 3 },
                      { date: "2026-01-02", contributionCount: 0 },
                    ],
                  },
                ],
              },
            },
          },
        },
      }),
    });

    const grid = await fetchContributionGrid("octocat", "fake-token");
    expect(grid.weeks).toEqual([
      [
        { date: "2026-01-01", count: 3 },
        { date: "2026-01-02", count: 0 },
      ],
    ]);
  });

  it("throws GitHubFetchError with status on a non-ok HTTP response", async () => {
    mockFetchOnce({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      text: async () => "Bad credentials",
    });

    await expect(fetchContributionGrid("octocat", "bad-token")).rejects.toMatchObject({
      status: 401,
    });
  });

  it("throws GitHubFetchError when the GraphQL response contains an errors array", async () => {
    mockFetchOnce({
      json: async () => ({ errors: [{ message: "Could not resolve to a User" }] }),
    });

    await expect(fetchContributionGrid("nonexistent-user", "token")).rejects.toThrow(
      /Could not resolve to a User/,
    );
  });

  it("throws GitHubFetchError when the response is missing the expected calendar data", async () => {
    mockFetchOnce({
      json: async () => ({ data: { user: null } }),
    });

    await expect(fetchContributionGrid("octocat", "token")).rejects.toThrow(
      /missing expected contribution calendar data/,
    );
  });

  it("throws GitHubFetchError on a network failure", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("ECONNREFUSED")) as unknown as typeof fetch;

    await expect(fetchContributionGrid("octocat", "token")).rejects.toThrow(/Network error/);
  });
});

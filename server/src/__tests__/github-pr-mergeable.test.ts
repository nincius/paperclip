import { describe, expect, it } from "vitest";
import { parseGitHubPullRequestUrl, parseGitHubRepoUrl } from "../services/github-pr-mergeable.ts";

describe("github-pr-mergeable", () => {
  it("parseGitHubPullRequestUrl accepts github.com pull URLs", () => {
    expect(parseGitHubPullRequestUrl("https://github.com/acme/app/pull/42")).toEqual({
      hostname: "github.com",
      owner: "acme",
      repo: "app",
      number: 42,
    });
    expect(parseGitHubPullRequestUrl("https://github.com/acme/app/pull/42/files")).toEqual({
      hostname: "github.com",
      owner: "acme",
      repo: "app",
      number: 42,
    });
  });

  it("parseGitHubPullRequestUrl returns null for non-PR URLs", () => {
    expect(parseGitHubPullRequestUrl("https://github.com/acme/app/issues/1")).toBeNull();
    expect(parseGitHubPullRequestUrl(null)).toBeNull();
  });

  it("parseGitHubRepoUrl parses repo root", () => {
    expect(parseGitHubRepoUrl("https://github.com/acme/app")).toEqual({
      hostname: "github.com",
      owner: "acme",
      repo: "app",
    });
    expect(parseGitHubRepoUrl("https://github.com/acme/app.git")).toEqual({
      hostname: "github.com",
      owner: "acme",
      repo: "app",
    });
  });
});

import { ConnectorsClient } from "@replit/connectors-sdk";
import type {
  CmsBlogPost,
  CmsBlogPostInput,
  CmsBlogPostUpdate,
  CmsCommitResult,
} from "@workspace/api-zod";

const GITHUB_CONNECTOR = "github-source-control";
const BLOG_PREFIX = "artifacts/max-portfolio/src/content/blog/";
const DEFAULT_REPOSITORY = "GrehBan/grehban.github.io";

type BlogLocale = "en" | "ru";

interface BlogTreeEntry {
  path?: string;
  sha?: string;
  type?: string;
}

interface GitHubTreeResponse {
  truncated?: boolean;
  tree?: BlogTreeEntry[];
}

interface GitHubBlobResponse {
  content?: string;
  encoding?: string;
}

interface GitHubRepositoryResponse {
  default_branch?: string;
}

interface GitHubFileResponse {
  sha?: string;
}

interface GitHubCommitResponse {
  content?: { path?: string };
  commit?: { sha?: string; html_url?: string };
}

interface GitHubRequestOptions {
  method?: "GET" | "PUT" | "DELETE";
  body?: Record<string, unknown>;
}

export interface BlogContentStore {
  list(): Promise<CmsBlogPost[]>;
  create(input: CmsBlogPostInput): Promise<CmsCommitResult>;
  update(locale: BlogLocale, slug: string, input: CmsBlogPostUpdate): Promise<CmsCommitResult>;
  delete(locale: BlogLocale, slug: string): Promise<CmsCommitResult>;
}

export class CmsStoreError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "CmsStoreError";
  }
}

export class GitHubBlogStore implements BlogContentStore {
  private connectors: ConnectorsClient | undefined;

  async list(): Promise<CmsBlogPost[]> {
    const { connectionId, owner, repository, branch } = await this.getContext();
    const tree = await this.githubRequest<GitHubTreeResponse>(
      connectionId,
      `/repos/${owner}/${repository}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
    );

    if (tree.truncated) {
      throw new CmsStoreError(502, "GitHub returned an incomplete repository listing.");
    }

    const files = (tree.tree ?? [])
      .filter(
        (entry): entry is BlogTreeEntry & { path: string; sha: string } =>
          entry.type === "blob" &&
          typeof entry.path === "string" &&
          typeof entry.sha === "string" &&
          entry.path.startsWith(BLOG_PREFIX) &&
          entry.path.endsWith(".md"),
      )
      .map((entry) => ({ path: entry.path, sha: entry.sha, locale: localeAndSlug(entry.path) }))
      .filter(
        (entry): entry is typeof entry & { locale: { locale: BlogLocale; slug: string } } =>
          entry.locale !== null,
      );

    const posts: CmsBlogPost[] = [];
    for (let index = 0; index < files.length; index += 8) {
      const batch = files.slice(index, index + 8);
      const loaded = await Promise.all(
        batch.map(async (file) => {
          const blob = await this.githubRequest<GitHubBlobResponse>(
            connectionId,
            `/repos/${owner}/${repository}/git/blobs/${encodeURIComponent(file.sha)}`,
          );
          if (blob.encoding !== "base64" || typeof blob.content !== "string") {
            throw new CmsStoreError(502, "A blog post could not be read from GitHub.");
          }
          return parseMarkdownPost(
            file.path,
            file.locale.locale,
            file.locale.slug,
            Buffer.from(blob.content, "base64").toString("utf8"),
          );
        }),
      );
      posts.push(...loaded);
    }

    return posts.sort((left, right) => right.pubDate.getTime() - left.pubDate.getTime());
  }

  async create(input: CmsBlogPostInput): Promise<CmsCommitResult> {
    const { connectionId, owner, repository, branch } = await this.getContext();
    const path = blogPath(input.locale, input.slug);
    try {
      await this.getFileSha(connectionId, owner, repository, branch, path);
      throw new CmsStoreError(409, "A post with this language and slug already exists.");
    } catch (error) {
      if (!(error instanceof CmsStoreError) || error.statusCode !== 404) {
        throw error;
      }
    }

    const content = serializeMarkdown(input, input.locale);
    const response = await this.githubRequest<GitHubCommitResponse>(
      connectionId,
      `/repos/${owner}/${repository}/contents/${encodeGitHubPath(path)}`,
      {
        method: "PUT",
        body: {
          message: `content(blog): create ${input.locale}/${input.slug}`,
          content: Buffer.from(content, "utf8").toString("base64"),
          branch,
        },
      },
    );
    return commitResult(path, response);
  }

  async update(locale: BlogLocale, slug: string, input: CmsBlogPostUpdate): Promise<CmsCommitResult> {
    const { connectionId, owner, repository, branch } = await this.getContext();
    const path = blogPath(locale, slug);
    const sha = await this.getFileSha(connectionId, owner, repository, branch, path);
    const content = serializeMarkdown(
      {
        ...input,
        locale,
        slug,
      },
      locale,
      new Date().toISOString().slice(0, 10),
    );
    const response = await this.githubRequest<GitHubCommitResponse>(
      connectionId,
      `/repos/${owner}/${repository}/contents/${encodeGitHubPath(path)}`,
      {
        method: "PUT",
        body: {
          message: `content(blog): update ${locale}/${slug}`,
          content: Buffer.from(content, "utf8").toString("base64"),
          branch,
          sha,
        },
      },
    );
    return commitResult(path, response);
  }

  async delete(locale: BlogLocale, slug: string): Promise<CmsCommitResult> {
    const { connectionId, owner, repository, branch } = await this.getContext();
    const path = blogPath(locale, slug);
    const sha = await this.getFileSha(connectionId, owner, repository, branch, path);
    const response = await this.githubRequest<GitHubCommitResponse>(
      connectionId,
      `/repos/${owner}/${repository}/contents/${encodeGitHubPath(path)}`,
      {
        method: "DELETE",
        body: {
          message: `content(blog): delete ${locale}/${slug}`,
          sha,
          branch,
        },
      },
    );
    return commitResult(path, response);
  }

  private async getContext(): Promise<{
    connectionId: string;
    owner: string;
    repository: string;
    branch: string;
  }> {
    const repositoryPath = process.env.CMS_GITHUB_REPOSITORY?.trim() || DEFAULT_REPOSITORY;
    const repositoryMatch = /^([A-Za-z0-9-]+)\/([A-Za-z0-9._-]+)$/.exec(repositoryPath);
    if (!repositoryMatch) {
      throw new CmsStoreError(503, "The GitHub repository setting is invalid.");
    }

    let connections;
    try {
      connections = await this.getConnectors().listConnections({
        connector_names: GITHUB_CONNECTOR,
        refresh_policy: "none",
      });
    } catch {
      throw new CmsStoreError(503, "The GitHub connection is unavailable to the API server.");
    }

    const configuredConnectionId = process.env.CMS_GITHUB_CONNECTION_ID?.trim();
    const connection =
      configuredConnectionId
        ? connections.find((item) => item.id === configuredConnectionId)
        : connections.length === 1
          ? connections[0]
          : undefined;
    if (!connection) {
      throw new CmsStoreError(
        503,
        connections.length > 1
          ? "Select one GitHub connection for the blog editor."
          : "Connect GitHub to the API server before managing blog posts.",
      );
    }

    const [, owner, repository] = repositoryMatch;
    const repo = await this.githubRequest<GitHubRepositoryResponse>(
      connection.id,
      `/repos/${owner}/${repository}`,
    );
    if (typeof repo.default_branch !== "string" || !repo.default_branch) {
      throw new CmsStoreError(502, "GitHub did not return the repository's default branch.");
    }

    return {
      connectionId: connection.id,
      owner,
      repository,
      branch: repo.default_branch,
    };
  }

  private async getFileSha(
    connectionId: string,
    owner: string,
    repository: string,
    branch: string,
    path: string,
  ): Promise<string> {
    const file = await this.githubRequest<GitHubFileResponse>(
      connectionId,
      `/repos/${owner}/${repository}/contents/${encodeGitHubPath(path)}?ref=${encodeURIComponent(branch)}`,
    );
    if (typeof file.sha !== "string" || !file.sha) {
      throw new CmsStoreError(502, "GitHub did not return the blog file version.");
    }
    return file.sha;
  }

  private async githubRequest<T>(
    connectionId: string,
    path: string,
    options: GitHubRequestOptions = {},
  ): Promise<T> {
    let response: Response;
    try {
      response = await this.getConnectors().proxy(GITHUB_CONNECTOR, path, {
        connectionId,
        method: options.method ?? "GET",
        headers: {
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        ...(options.body ? { body: options.body } : {}),
      });
    } catch {
      throw new CmsStoreError(503, "The GitHub connection could not reach the repository.");
    }

    const text = await response.text();
    let payload: unknown;
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        throw new CmsStoreError(502, "GitHub returned an unreadable response.");
      }
    }

    if (!response.ok) {
      if (response.status === 404) {
        throw new CmsStoreError(404, "The blog post or repository was not found.");
      }
      if (response.status === 401 || response.status === 403) {
        throw new CmsStoreError(503, "The GitHub connection needs repository access.");
      }
      if (response.status === 409 || response.status === 422) {
        throw new CmsStoreError(409, "GitHub rejected a conflicting blog change. Reload and try again.");
      }
      throw new CmsStoreError(502, "GitHub could not complete the blog operation.");
    }

    return payload as T;
  }

  private getConnectors(): ConnectorsClient {
    this.connectors ??= new ConnectorsClient();
    return this.connectors;
  }
}

function localeAndSlug(path: string): { locale: BlogLocale; slug: string } | null {
  const relativePath = path.slice(BLOG_PREFIX.length);
  const russian = /^ru\/([a-z0-9]+(?:-[a-z0-9]+)*)\.md$/.exec(relativePath);
  if (russian) {
    return { locale: "ru", slug: russian[1] };
  }
  const english = /^([a-z0-9]+(?:-[a-z0-9]+)*)\.md$/.exec(relativePath);
  if (english) {
    return { locale: "en", slug: english[1] };
  }
  return null;
}

function blogPath(locale: BlogLocale, slug: string): string {
  const directory = locale === "ru" ? `${BLOG_PREFIX}ru/` : BLOG_PREFIX;
  return `${directory}${slug}.md`;
}

function encodeGitHubPath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

function parseMarkdownPost(
  path: string,
  locale: BlogLocale,
  slug: string,
  markdown: string,
): CmsBlogPost {
  const match = /^---\s*\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(markdown);
  if (!match) {
    throw new CmsStoreError(502, "A blog post is missing valid frontmatter.");
  }

  const frontmatter = match[1];
  const title = parseYamlString(readYamlValue(frontmatter, "title"));
  const description = parseYamlString(readYamlValue(frontmatter, "description"));
  const pubDateValue = parseYamlString(readYamlValue(frontmatter, "pubDate"));
  const updatedDateValue = readYamlValue(frontmatter, "updatedDate");
  const updatedDateString = updatedDateValue ? parseYamlString(updatedDateValue) : undefined;
  const updatedDate = updatedDateString ? new Date(`${updatedDateString}T00:00:00.000Z`) : undefined;
  const localeValue = readYamlValue(frontmatter, "locale");
  const frontmatterLocale = localeValue ? parseYamlString(localeValue) : "en";
  const draftValue = readYamlValue(frontmatter, "draft");
  const tagsValue = readYamlValue(frontmatter, "tags");
  const tags = parseYamlTags(tagsValue);
  const body = markdown.slice(match[0].length).replace(/^\r?\n/, "").replace(/\r\n/g, "\n");

  if (
    !title ||
    !description ||
    !isDate(pubDateValue) ||
    (updatedDateString !== undefined && !isDate(updatedDateString)) ||
    frontmatterLocale !== locale
  ) {
    throw new CmsStoreError(502, "A blog post has invalid or mismatched frontmatter.");
  }

  return {
    path,
    locale,
    slug,
    title,
    description,
    pubDate: new Date(`${pubDateValue}T00:00:00.000Z`),
    ...(updatedDate ? { updatedDate } : {}),
    tags,
    draft: draftValue === "true",
    body,
  };
}

function readYamlValue(frontmatter: string, key: string): string | undefined {
  const line = frontmatter.split(/\r?\n/).find((entry) => entry.startsWith(`${key}:`));
  return line?.slice(key.length + 1).trim();
}

function parseYamlString(value: string | undefined): string {
  if (!value) {
    return "";
  }
  if (value.startsWith('"')) {
    try {
      const parsed: unknown = JSON.parse(value);
      return typeof parsed === "string" ? parsed : "";
    } catch {
      return "";
    }
  }
  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replace(/''/g, "'");
  }
  return value;
}

function parseYamlTags(value: string | undefined): string[] {
  if (!value) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed) && parsed.every((tag) => typeof tag === "string")) {
      return parsed;
    }
  } catch {
    // Existing posts may use YAML's unquoted inline list form.
  }
  return value
    .replace(/^\[/, "")
    .replace(/\]$/, "")
    .split(",")
    .map((tag) => parseYamlString(tag.trim()))
    .filter(Boolean);
}

function isDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function serializeMarkdown(
  input: CmsBlogPostInput | (CmsBlogPostUpdate & { locale: BlogLocale; slug: string }),
  locale: BlogLocale,
  updatedDate?: string,
): string {
  const pubDate = input.pubDate.toISOString().slice(0, 10);
  const lines = [
    "---",
    `title: ${JSON.stringify(input.title)}`,
    `description: ${JSON.stringify(input.description)}`,
    `pubDate: ${pubDate}`,
    ...(updatedDate ? [`updatedDate: ${updatedDate}`] : []),
    `tags: ${JSON.stringify(input.tags)}`,
    `draft: ${String(input.draft ?? false)}`,
    `locale: ${locale}`,
    "---",
    "",
    input.body.replace(/\r\n/g, "\n").replace(/\n*$/, ""),
  ];
  return `${lines.join("\n")}\n`;
}

function commitResult(path: string, response: GitHubCommitResponse): CmsCommitResult {
  const commitSha = response.commit?.sha;
  const commitUrl = response.commit?.html_url;
  if (
    typeof commitSha !== "string" ||
    typeof commitUrl !== "string" ||
    !commitUrl.startsWith("https://github.com/")
  ) {
    throw new CmsStoreError(502, "GitHub did not confirm the blog change.");
  }
  return { path, commitSha, commitUrl };
}

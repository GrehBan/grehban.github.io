import { Router, type IRouter, type RequestHandler } from "express";
import {
  CmsCreateBlogPostBody,
  CmsCreateBlogPostResponse,
  CmsDeleteBlogPostParams,
  CmsDeleteBlogPostResponse,
  CmsListBlogPostsResponse,
  CmsLoginBody,
  CmsLoginResponse,
  CmsUpdateBlogPostBody,
  CmsUpdateBlogPostParams,
  CmsUpdateBlogPostResponse,
} from "@workspace/api-zod";
import {
  CmsAuthConfigurationError,
  createCmsSession,
  requireCmsAuth,
  verifyAdminCredentials,
} from "../lib/cms-auth";
import {
  CmsStoreError,
  GitHubBlogStore,
  type BlogContentStore,
} from "../lib/github-blog-store";

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 5;

interface LoginBucket {
  count: number;
  resetAt: number;
}

export function createCmsRouter(store: BlogContentStore = new GitHubBlogStore()): IRouter {
  const router: IRouter = Router();
  const loginAttempts = new Map<string, LoginBucket>();

  router.use("/cms", ((_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  }) as RequestHandler);

  router.post("/cms/login", (req, res, next) => {
    const key = req.ip ?? req.socket.remoteAddress ?? "unknown";
    const now = Date.now();
    let bucket = loginAttempts.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + LOGIN_WINDOW_MS };
      loginAttempts.set(key, bucket);
    }

    if (bucket.count >= LOGIN_MAX_ATTEMPTS) {
      res.setHeader("Retry-After", String(Math.ceil((bucket.resetAt - now) / 1000)));
      res.status(429).json({ error: "Too many login attempts. Try again later." });
      return;
    }

    bucket.count += 1;
    next();
  }, (req, res): void => {
    const parsed = CmsLoginBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Enter a username and password." });
      return;
    }

    try {
      if (!verifyAdminCredentials(parsed.data.username, parsed.data.password)) {
        req.log.warn("Rejected blog editor login");
        res.status(401).json({ error: "Invalid username or password." });
        return;
      }

      loginAttempts.delete(req.ip ?? req.socket.remoteAddress ?? "unknown");
      res.json(CmsLoginResponse.parse(createCmsSession()));
    } catch (error) {
      if (error instanceof CmsAuthConfigurationError) {
        res.status(503).json({ error: error.message });
        return;
      }
      req.log.error({ errorName: error instanceof Error ? error.name : "UnknownError" }, "Blog editor login failed");
      res.status(500).json({ error: "Could not sign in. Try again later." });
    }
  });

  router.use("/cms/posts", requireCmsAuth);

  router.get("/cms/posts", async (req, res): Promise<void> => {
    try {
      res.json(CmsListBlogPostsResponse.parse(await store.list()));
    } catch (error) {
      sendStoreError(req, res, error);
    }
  });

  router.post("/cms/posts", async (req, res): Promise<void> => {
    const parsed = CmsCreateBlogPostBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Check the post fields and try again." });
      return;
    }

    try {
      const result = await store.create(parsed.data);
      res.status(201).json(CmsCreateBlogPostResponse.parse(result));
    } catch (error) {
      sendStoreError(req, res, error);
    }
  });

  router.put("/cms/posts/:locale/:slug", async (req, res): Promise<void> => {
    const params = CmsUpdateBlogPostParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Choose a valid language and post slug." });
      return;
    }

    const parsed = CmsUpdateBlogPostBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Check the post fields and try again." });
      return;
    }

    try {
      const result = await store.update(params.data.locale, params.data.slug, parsed.data);
      res.json(CmsUpdateBlogPostResponse.parse(result));
    } catch (error) {
      sendStoreError(req, res, error);
    }
  });

  router.delete("/cms/posts/:locale/:slug", async (req, res): Promise<void> => {
    const params = CmsDeleteBlogPostParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Choose a valid language and post slug." });
      return;
    }

    try {
      const result = await store.delete(params.data.locale, params.data.slug);
      res.json(CmsDeleteBlogPostResponse.parse(result));
    } catch (error) {
      sendStoreError(req, res, error);
    }
  });

  return router;
}

function sendStoreError(
  req: Parameters<RequestHandler>[0],
  res: Parameters<RequestHandler>[1],
  error: unknown,
): void {
  if (error instanceof CmsStoreError) {
    req.log.warn({ statusCode: error.statusCode }, "Blog content operation failed");
    res.status(error.statusCode).json({ error: error.message });
    return;
  }

  req.log.error(
    { errorName: error instanceof Error ? error.name : "UnknownError" },
    "Blog content operation failed",
  );
  res.status(502).json({ error: "The GitHub blog service is temporarily unavailable." });
}

export default createCmsRouter();

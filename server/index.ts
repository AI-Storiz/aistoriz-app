import "dotenv/config";
import express from "express";
import type { Request, Response, NextFunction } from "express";
import { registerRoutes, recoverStuckJobs } from "./routes";
import { waitForDatabase } from "./db";
import * as fs from "fs";
import * as path from "path";
import { createProxyMiddleware } from "http-proxy-middleware";

const app = express();
const log = console.log;
const isDev = process.env.NODE_ENV !== "production";

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

function isPrivateLanHostname(hostname: string): boolean {
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return true;
  }
  const m = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(hostname);
  if (!m) {
    return false;
  }
  const a = Number(m[1]);
  const b = Number(m[2]);
  if (a === 10) {
    return true;
  }
  if (a === 192 && b === 168) {
    return true;
  }
  if (a === 172 && b >= 16 && b <= 31) {
    return true;
  }
  return false;
}

function setupCors(app: express.Application) {
  app.use((req, res, next) => {
    const origin = req.header("origin");
    
    if (!origin) {
      return next();
    }

    // Parse the origin to check the hostname
    let originHostname: string;
    try {
      const url = new URL(origin);
      originHostname = url.hostname;
    } catch {
      return next();
    }

    // Check if origin is from a Replit domain (any port)
    const isReplitDomain = 
      originHostname.endsWith('.replit.dev') || 
      originHostname.endsWith('.repl.co') ||
      originHostname.endsWith('.replit.app');

    // Allow localhost origins for Expo web development (any port)
    const isLocalhost =
      originHostname === 'localhost' ||
      originHostname === '127.0.0.1';

    // Expo web from LAN URL (e.g. http://192.168.x.x:8081) needs CORS to the API
    const isLanDevOrigin = isDev && isPrivateLanHostname(originHostname);

    if (isReplitDomain || isLocalhost || isLanDevOrigin) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS, PATCH",
      );
      res.header(
        "Access-Control-Allow-Headers", 
        "Content-Type, Authorization, Cache-Control, X-Requested-With, Accept, Pragma, Expires, If-Modified-Since"
      );
      res.header("Access-Control-Allow-Credentials", "true");
      res.header("Access-Control-Max-Age", "86400");
    }

    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }

    next();
  });
}

function setupBodyParsing(app: express.Application) {
  app.use(
    express.json({
      limit: '100mb',
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  app.use(express.urlencoded({ extended: false, limit: '100mb' }));
}

function setupRequestLogging(app: express.Application) {
  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, unknown> | undefined = undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
      if (!path.startsWith("/api")) return;

      const duration = Date.now() - start;

      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    });

    next();
  });
}

function getAppName(): string {
  try {
    const appJsonPath = path.resolve(process.cwd(), "app.json");
    const appJsonContent = fs.readFileSync(appJsonPath, "utf-8");
    const appJson = JSON.parse(appJsonContent);
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}

function serveExpoManifest(platform: string, res: Response) {
  const manifestPath = path.resolve(
    process.cwd(),
    "static-build",
    platform,
    "manifest.json",
  );

  if (!fs.existsSync(manifestPath)) {
    return res
      .status(404)
      .json({ error: `Manifest not found for platform: ${platform}` });
  }

  res.setHeader("expo-protocol-version", "1");
  res.setHeader("expo-sfv-version", "0");
  res.setHeader("content-type", "application/json");

  const manifest = fs.readFileSync(manifestPath, "utf-8");
  res.send(manifest);
}

function serveLandingPage({
  req,
  res,
  landingPageTemplate,
  appName,
}: {
  req: Request;
  res: Response;
  landingPageTemplate: string;
  appName: string;
}) {
  const forwardedProto = req.header("x-forwarded-proto");
  const protocol = forwardedProto || req.protocol || "https";
  const forwardedHost = req.header("x-forwarded-host");
  const host = forwardedHost || req.get("host");
  const baseUrl = `${protocol}://${host}`;
  const expsUrl = `${host}`;

  log(`baseUrl`, baseUrl);
  log(`expsUrl`, expsUrl);

  const html = landingPageTemplate
    .replace(/BASE_URL_PLACEHOLDER/g, baseUrl)
    .replace(/EXPS_URL_PLACEHOLDER/g, expsUrl)
    .replace(/APP_NAME_PLACEHOLDER/g, appName);

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}

const ACCOUNT_DELETION_SUPPORT_EMAIL = "fiocreativesolutions@gmail.com";

function registerLegalPages(app: express.Application) {
  const templatesDir = path.resolve(process.cwd(), "server", "templates");
  const privacyTemplate = fs.readFileSync(
    path.join(templatesDir, "privacy.html"),
    "utf-8",
  );
  const accountDeletionTemplate = fs.readFileSync(
    path.join(templatesDir, "account-deletion.html"),
    "utf-8",
  );
  const appName = getAppName();

  const renderLegalPage = (template: string) =>
    template
      .replace(/APP_NAME_PLACEHOLDER/g, appName)
      .replace(/SUPPORT_EMAIL_PLACEHOLDER/g, ACCOUNT_DELETION_SUPPORT_EMAIL);

  app.get("/privacy", (_req: Request, res: Response) => {
    const html = renderLegalPage(privacyTemplate);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(html);
  });

  app.get("/account-deletion", (_req: Request, res: Response) => {
    const html = renderLegalPage(accountDeletionTemplate);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(html);
  });

  log("Legal pages: GET /privacy, GET /account-deletion");
}

function configureExpoAndLanding(app: express.Application) {
  const templatePath = path.resolve(
    process.cwd(),
    "server",
    "templates",
    "landing-page.html",
  );
  const landingPageTemplate = fs.readFileSync(templatePath, "utf-8");
  const appName = getAppName();

  log("Serving static Expo files with dynamic manifest routing");

  // In development, proxy non-API requests to Expo dev server
  if (isDev) {
    log("Development mode: Setting up proxy to Expo dev server on port 8081");
    
    // Proxy everything except /api/* to Expo dev server
    app.use((req: Request, res: Response, next: NextFunction) => {
      // Skip API routes - they're handled by Express
      if (req.path.startsWith("/api")) {
        return next();
      }
      
      // Handle expo-platform header for mobile app manifests
      const platform = req.header("expo-platform");
      if (platform && (platform === "ios" || platform === "android")) {
        return serveExpoManifest(platform, res);
      }
      
      // For root path, serve landing page (for users who access via browser)
      // But if it looks like a bundle request, proxy to Expo
      const userAgent = req.header("user-agent") || "";
      const isExpoClient = userAgent.includes("Expo") || req.header("expo-platform");
      
      if (req.path === "/" && !isExpoClient && !req.query.platform) {
        return serveLandingPage({
          req,
          res,
          landingPageTemplate,
          appName,
        });
      }
      
      // Proxy all other requests to Expo dev server
      next();
    });
    
    // Set up proxy to Expo dev server
    const expoProxy = createProxyMiddleware({
      target: "http://localhost:8081",
      changeOrigin: true,
      ws: true,
      on: {
        error: (err: Error, _req: Request, res: Response | any) => {
          log(`Proxy error: ${err.message}`);
          if (res && !res.headersSent && typeof res.status === 'function') {
            res.status(502).send("Expo dev server not ready");
          }
        },
      },
    });
    
    app.use(expoProxy);
  } else {
    // Production mode - serve static files
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.path.startsWith("/api")) {
        return next();
      }

      if (req.path !== "/" && req.path !== "/manifest") {
        return next();
      }

      const platform = req.header("expo-platform");
      if (platform && (platform === "ios" || platform === "android")) {
        return serveExpoManifest(platform, res);
      }

      if (req.path === "/") {
        return serveLandingPage({
          req,
          res,
          landingPageTemplate,
          appName,
        });
      }

      next();
    });

    app.use("/assets", express.static(path.resolve(process.cwd(), "assets")));
    app.use(express.static(path.resolve(process.cwd(), "static-build")));
  }

  log("Expo routing: Checking expo-platform header on / and /manifest");
}

function setupErrorHandler(app: express.Application) {
  app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    const error = err as {
      status?: number;
      statusCode?: number;
      message?: string;
    };

    const status = error.status || error.statusCode || 500;
    const message = error.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });
}

(async () => {
  setupCors(app);
  setupBodyParsing(app);
  setupRequestLogging(app);

  // Register API routes FIRST (before proxy) so they take precedence
  const server = await registerRoutes(app);

  const dbReady = await waitForDatabase();
  if (dbReady) {
    await recoverStuckJobs();
    log("Job recovery check completed");
  } else {
    log("Job recovery skipped — database unavailable");
  }

  registerLegalPages(app);

  // Then set up Expo/landing page handling (includes proxy in dev mode)
  configureExpoAndLanding(app);

  setupErrorHandler(app);

  const port = parseInt(process.env.PORT || "5001", 10);
  const listenOptions: {
    port: number;
    host: string;
    reusePort?: boolean;
  } = {
    port,
    host: "0.0.0.0",
  };

  // SO_REUSEPORT is only safe to enable on Linux. Windows and macOS return ENOTSUP.
  if (process.platform === "linux") {
    listenOptions.reusePort = true;
  }

  server.listen(listenOptions, () => {
    log(`express server serving on port ${port}`);
  });
})();

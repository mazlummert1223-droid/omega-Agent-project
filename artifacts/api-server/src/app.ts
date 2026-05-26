import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import {
  rateLimiter,
  promptInjectionGuard,
  inputSanitizer,
  requestCounter,
  errorSanitizer,
} from "./middleware/security";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Security Middleware Stack ──────────────────────────────────────────────────
app.use("/api", requestCounter);
app.use("/api", rateLimiter);
app.use("/api", inputSanitizer);
app.use("/api/agent", promptInjectionGuard);
app.use("/api/openai", promptInjectionGuard);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api", router);

// ── Error Sanitizer (must be last) ────────────────────────────────────────────
app.use(errorSanitizer);

export default app;

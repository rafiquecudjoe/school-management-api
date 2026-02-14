const http = require("http");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { rateLimit } = require("express-rate-limit");
const swaggerUi = require("swagger-ui-express");
const openApiDocument = require("../../docs/openapi.json");
const app = express();

module.exports = class UserServer {
  constructor({ config, managers }) {
    this.config = config;
    this.userApi = managers.userApi;
  }

  /** for injecting middlewares */
  use(args) {
    app.use(args);
  }

  /** server configs */
  run() {
    const maxBodySize = process.env.API_MAX_BODY_SIZE || "100kb";
    const rateLimitWindowMs =
      Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;
    const rateLimitMax = Number(process.env.RATE_LIMIT_MAX) || 300;
    const allowedOrigin = process.env.CORS_ORIGIN || "*";

    app.get("/health", (req, res) => {
      res.status(200).send({
        ok: true,
        data: { service: this.config.dotEnv.SERVICE_NAME, status: "up" },
        errors: [],
        message: "",
      });
    });
    app.get("/docs.json", (req, res) => {
      res.status(200).json(openApiDocument);
    });
    app.use(
      "/docs",
      swaggerUi.serve,
      swaggerUi.setup(openApiDocument, {
        customSiteTitle: "Axion School API Docs",
      }),
    );

    app.use(helmet());
    app.use(
      rateLimit({
        windowMs: rateLimitWindowMs,
        max: rateLimitMax,
        standardHeaders: true,
        legacyHeaders: false,
        message: {
          ok: false,
          data: {},
          errors: "rate_limit_exceeded",
          message: "Too many requests, please try again later",
        },
      }),
    );
    app.use(cors({ origin: allowedOrigin }));
    app.use(express.json({ limit: maxBodySize }));
    app.use(express.urlencoded({ extended: true, limit: maxBodySize }));
    app.use("/static", express.static("public"));

    /** a single middleware to handle all */
    app.all("/api/:moduleName/:fnName", this.userApi.mw);

    /** centralized error handler */
    app.use((err, req, res, next) => {
      console.error(err && err.stack ? err.stack : err);
      res.status(500).send({
        ok: false,
        data: {},
        errors: [],
        message: "Internal server error",
      });
    });

    let server = http.createServer(app);
    server.listen(this.config.dotEnv.USER_PORT, () => {
      console.log(
        `${this.config.dotEnv.SERVICE_NAME.toUpperCase()} is running on port: ${this.config.dotEnv.USER_PORT}`,
      );
    });
  }
};

import { toStandardJsonSchema } from "@valibot/to-json-schema";
import { c, group } from "argc";
import { boolean, object, optional, string } from "valibot";

const s = toStandardJsonSchema;

export const cliOptions = {
  name: "app-cli",
  version: "0.1.0",
  description: "Demo operator CLI for the web-flow-testing reference app",
  globals: s(
    object({
      pretty: optional(boolean()),
    }),
  ),
};

export const schema = {
  env: group(
    { description: "Environment and demo-state operations" },
    {
      validate: c
        .meta({
          description: "Validate local demo runtime and state file path",
          examples: ["app-cli env validate"],
        })
        .input(s(object({}))),
      reset: c
        .meta({
          description: "Reset demo state; dry-run by default, execute with --execute",
          examples: ["app-cli env reset", "app-cli env reset --execute"],
        })
        .input(
          s(
            object({
              execute: optional(boolean()),
            }),
          ),
        ),
    },
  ),
  user: group(
    { description: "Test identity operations" },
    {
      ensure: c
        .meta({
          description: "Create or find a reusable demo test user; dry-run by default",
          examples: [
            "app-cli user ensure --email agent-smoke@example.com",
            "app-cli user ensure --email agent-smoke@example.com --execute",
          ],
        })
        .input(
          s(
            object({
              email: string(),
              name: optional(string()),
              execute: optional(boolean()),
            }),
          ),
        ),
      snapshot: c
        .meta({
          description: "Read auth user plus app account state for a demo test user",
          examples: ["app-cli user snapshot --email agent-smoke@example.com"],
        })
        .input(
          s(
            object({
              email: string(),
            }),
          ),
        ),
    },
  ),
  flow: group(
    { description: "Submitted web-flow state operations" },
    {
      seed: c
        .meta({
          description:
            "Create a submitted request directly for CLI-only demos; dry-run by default",
          examples: [
            "app-cli flow seed --email agent-smoke@example.com --source-url https://example.com --execute",
          ],
        })
        .input(
          s(
            object({
              email: string(),
              sourceUrl: string(),
              execute: optional(boolean()),
            }),
          ),
        ),
      snapshot: c
        .meta({
          description: "Read a submitted flow and linked order/job/project facts",
          examples: ["app-cli flow snapshot --public-id req_demo_001"],
        })
        .input(
          s(
            object({
              publicId: string(),
            }),
          ),
        ),
      assert: c
        .meta({
          description: "Assert a durable flow status",
          examples: [
            "app-cli flow assert --public-id req_demo_001 --expect-status awaiting_payment",
          ],
        })
        .input(
          s(
            object({
              publicId: string(),
              expectStatus: string(),
            }),
          ),
        ),
    },
  ),
};

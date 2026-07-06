import "./styles.css";

import type { ApiEnvelope, DemoFlow, DemoScenario, DemoState, DemoUser } from "./types";

const defaultEmail = "agent-smoke@example.com";
const defaultSourceUrl = "https://example.com/pricing";
const defaultScenario: DemoScenario = "happy";
const demoScenarios: DemoScenario[] = [
  "happy",
  "job-running",
  "webhook-delayed",
  "owner-mismatch",
  "ui-success-backend-failed",
  "backend-ready-ui-stale",
  "console-error",
];
const reportedConsoleScenarios = new Set<string>();

const appRoot = getAppRoot();

type ViewModel = {
  state: DemoState | null;
  selectedRequestId: string | null;
  notice: string | null;
};

const model: ViewModel = {
  state: null,
  selectedRequestId: null,
  notice: null,
};

void refresh();

async function refresh() {
  model.state = await api<DemoState>("/api/state");
  const requestIds = Object.keys(model.state.requests);
  model.selectedRequestId = model.selectedRequestId ?? requestIds[requestIds.length - 1] ?? null;
  render();
}

function render() {
  const state = model.state;
  if (!state) return;

  const selectedFlow = model.selectedRequestId ? state.requests[model.selectedRequestId] : null;
  const sessionUser = state.sessionEmail ? state.users[state.sessionEmail] : null;
  reportScenarioConsoleError(selectedFlow);

  appRoot.innerHTML = `
    <main class="app-shell">
      <header class="topbar">
        <div>
          <p class="eyebrow">Reference implementation</p>
          <h1>Web Flow Testing Demo</h1>
        </div>
        <div class="env-pill">local :5174</div>
      </header>

      <section class="hero-band">
        <div class="hero-copy">
          <h2>Submit flow. Durable proof.</h2>
          <p>Every public id ties the visible result to request, order, job, and project state.</p>
        </div>
        <div class="status-strip">
          ${metric("Users", Object.keys(state.users).length)}
          ${metric("Requests", Object.keys(state.requests).length)}
          ${metric("Session", state.sessionEmail ?? "signed out")}
        </div>
      </section>

      <section class="workspace">
        <div class="flow-panel">
          <div class="panel-heading">
            <p class="eyebrow">User flow</p>
            <h3>Submit and unlock</h3>
          </div>
          ${model.notice ? `<div class="notice">${escapeHtml(model.notice)}</div>` : ""}
          <form id="identity-form" class="form-grid">
            <label>
              Test email
              <input name="email" type="email" value="${escapeHtml(state.sessionEmail ?? defaultEmail)}" />
            </label>
            <button type="submit">Sign in</button>
          </form>

          <form id="submit-form" class="form-grid">
            <label>
              Source URL
              <input name="sourceUrl" type="url" value="${defaultSourceUrl}" ${sessionUser ? "" : "disabled"} />
            </label>
            <label>
              Scenario
              <select name="scenario" ${sessionUser ? "" : "disabled"}>
                ${demoScenarios.map((scenario) => `<option value="${scenario}">${scenario}</option>`).join("")}
              </select>
            </label>
            <button type="submit" ${sessionUser ? "" : "disabled"}>Submit</button>
          </form>

          ${selectedFlow ? renderFlowResult(selectedFlow) : emptyState(sessionUser)}
        </div>

        <aside class="facts-panel">
          <div class="panel-heading">
            <p class="eyebrow">Backend facts</p>
            <h3>Durable snapshot</h3>
          </div>
          ${sessionUser ? renderUserFacts(sessionUser) : `<p class="muted">No signed-in test identity.</p>`}
          ${selectedFlow ? renderFlowFacts(selectedFlow) : `<p class="muted">No submitted request yet.</p>`}
        </aside>
      </section>
    </main>
  `;

  bindEvents();
}

function bindEvents() {
  document.querySelector<HTMLFormElement>("#identity-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget as HTMLFormElement);
    const email = String(form.get("email") ?? defaultEmail);
    void signIn(email);
  });

  document.querySelector<HTMLFormElement>("#submit-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget as HTMLFormElement);
    const sourceUrl = String(form.get("sourceUrl") ?? defaultSourceUrl);
    const scenario = String(form.get("scenario") ?? defaultScenario) as DemoScenario;
    void submitRequest(sourceUrl, scenario);
  });

  document.querySelector<HTMLButtonElement>("[data-action='checkout']")?.addEventListener("click", () => {
    if (!model.selectedRequestId) return;
    void checkout(model.selectedRequestId);
  });

  document.querySelector<HTMLButtonElement>("[data-action='reset']")?.addEventListener("click", () => {
    void reset();
  });
}

async function signIn(email: string) {
  try {
    const user = await api<DemoUser>("/api/users/ensure", {
      method: "POST",
      body: {
        email,
        name: "Agent Smoke",
      },
    });
    await api<DemoState>("/api/session", {
      method: "POST",
      body: {
        email: user.email,
      },
    });
    model.notice = `Signed in as ${user.email}`;
    await refresh();
  } catch (error) {
    model.notice = errorMessage(error);
    render();
  }
}

async function submitRequest(sourceUrl: string, scenario: DemoScenario) {
  const state = model.state;
  if (!state?.sessionEmail) return;
  try {
    const flow = await api<DemoFlow>("/api/requests", {
      method: "POST",
      body: {
        email: state.sessionEmail,
        sourceUrl,
        scenario,
      },
    });
    model.selectedRequestId = flow.publicId;
    model.notice = flow.duplicateOf
      ? `Duplicate submit returned ${flow.publicId}`
      : `Created ${flow.publicId}`;
    window.history.replaceState(null, "", `/requests/${flow.publicId}`);
    await refresh();
  } catch (error) {
    model.notice = errorMessage(error);
    render();
  }
}

async function checkout(publicId: string) {
  try {
    const flow = await api<DemoFlow>("/api/checkout", {
      method: "POST",
      body: {
        publicId,
      },
    });
    model.selectedRequestId = flow.publicId;
    model.notice = flow.status === "ready"
      ? `Unlocked ${flow.project.publicId}`
      : `Checkout accepted; ${flow.scenario} still needs backend proof`;
    window.history.replaceState(null, "", `/projects/${flow.project.publicId}`);
    await refresh();
  } catch (error) {
    model.notice = errorMessage(error);
    render();
  }
}

async function reset() {
  try {
    await api<DemoState>("/api/reset", {
      method: "POST",
    });
    model.selectedRequestId = null;
    model.notice = "Demo state reset";
    window.history.replaceState(null, "", "/");
    await refresh();
  } catch (error) {
    model.notice = errorMessage(error);
    render();
  }
}

async function api<T>(path: string, options: { method?: string; body?: unknown } = {}) {
  const response = await fetch(path, {
    method: options.method ?? "GET",
    headers: options.body ? { "content-type": "application/json" } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const payload = (await response.json()) as ApiEnvelope<T>;
  if (!payload.ok) {
    throw new Error(payload.error.message);
  }
  return payload.data;
}

function metric(label: string, value: string | number) {
  return `
    <div class="metric">
      <span>${label}</span>
      <strong>${escapeHtml(String(value))}</strong>
    </div>
  `;
}

function emptyState(user: DemoUser | null) {
  return `
    <div class="empty-state">
      <h4>${user ? "Ready for a submit" : "Sign in a test identity"}</h4>
      <p>${user ? "The next request will create durable state for CLI snapshots." : "The demo will create or reuse a fake test user."}</p>
    </div>
  `;
}

function renderFlowResult(flow: DemoFlow) {
  const ready = flow.ui.visibleStatus === "ready";
  return `
    <div class="result-block">
      <div>
        <p class="eyebrow">Public id</p>
        <strong>${escapeHtml(flow.publicId)}</strong>
      </div>
      <div>
        <p class="eyebrow">UI result</p>
        <strong>${escapeHtml(flow.ui.resultLabel)}</strong>
      </div>
      <div>
        <p class="eyebrow">Gate</p>
        <strong>${escapeHtml(flow.ui.gateLabel)}</strong>
      </div>
      <button data-action="checkout" ${ready ? "disabled" : ""}>${ready ? "Paid" : "Pay test $2"}</button>
      <button class="secondary" data-action="reset">Reset</button>
    </div>
    <div class="scenario-block">
      <p class="eyebrow">Scenario</p>
      <strong>${escapeHtml(flow.scenario)}</strong>
      <p>${escapeHtml(scenarioHint(flow))}</p>
      ${flow.ui.errorBanner ? `<p class="error-text">${escapeHtml(flow.ui.errorBanner)}</p>` : ""}
    </div>
  `;
}

function renderUserFacts(user: DemoUser) {
  return `
    <dl class="facts">
      <div><dt>Email</dt><dd>${escapeHtml(user.email)}</dd></div>
      <div><dt>Auth user</dt><dd>${escapeHtml(user.authUserId)}</dd></div>
      <div><dt>App user</dt><dd>${escapeHtml(user.appUserId)}</dd></div>
      <div><dt>Verified</dt><dd>${user.emailVerified ? "true" : "false"}</dd></div>
    </dl>
  `;
}

function renderFlowFacts(flow: DemoFlow) {
  return `
    <dl class="facts facts-spaced">
      <div><dt>Scenario</dt><dd>${escapeHtml(flow.scenario)}</dd></div>
      <div><dt>Request</dt><dd>${escapeHtml(flow.status)}</dd></div>
      <div><dt>UI status</dt><dd>${escapeHtml(flow.ui.visibleStatus)}${flow.ui.stale ? " / stale" : ""}</dd></div>
      <div><dt>Source</dt><dd>${escapeHtml(flow.sourceUrl)}</dd></div>
      <div><dt>Order</dt><dd>${escapeHtml(flow.order.status)}</dd></div>
      <div><dt>Job</dt><dd>${escapeHtml(flow.job.status)} / ${escapeHtml(flow.job.phase)}</dd></div>
      <div><dt>Project</dt><dd>${escapeHtml(flow.project.publicId)} / ${escapeHtml(flow.project.status)}</dd></div>
      <div><dt>Owner</dt><dd>${escapeHtml(flow.accountEmail)}</dd></div>
      <div><dt>Submits</dt><dd>${flow.submitCount}${flow.duplicateOf ? ` / duplicate of ${escapeHtml(flow.duplicateOf)}` : ""}</dd></div>
    </dl>
  `;
}

function scenarioHint(flow: DemoFlow) {
  if (flow.scenario === "job-running") {
    return "Partial: payment settled, but the durable job is still running.";
  }
  if (flow.scenario === "webhook-delayed") {
    return "Partial: checkout reached paid, but the provider webhook has not settled the order.";
  }
  if (flow.scenario === "owner-mismatch") {
    return "Blocked: the visible actor and durable owner differ; run flow assert-owner.";
  }
  if (flow.scenario === "ui-success-backend-failed") {
    return "Blocked: the UI looks ready while backend state remains awaiting payment.";
  }
  if (flow.scenario === "backend-ready-ui-stale") {
    return "Partial: backend is ready while the browser still shows the pay gate.";
  }
  if (flow.scenario === "console-error") {
    return "Blocked until browser logs are captured and explained.";
  }
  if (flow.duplicateOf) {
    return "Duplicate submit: the backend reused the existing public id.";
  }
  return "Pass candidate: finish with CLI snapshot and assert commands.";
}

function reportScenarioConsoleError(flow: DemoFlow | null) {
  if (!flow || flow.scenario !== "console-error" || reportedConsoleScenarios.has(flow.publicId)) return;
  reportedConsoleScenarios.add(flow.publicId);
  console.error(`Intentional demo console error for ${flow.publicId}`);
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function getAppRoot() {
  const root = document.querySelector<HTMLDivElement>("#app");
  if (!root) {
    throw new Error("App root was not found.");
  }
  return root;
}

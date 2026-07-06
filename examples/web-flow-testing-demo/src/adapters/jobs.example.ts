import type { JobProviderAdapter, JobSnapshot, JobSnapshotInput } from "./types";

import { getFlowSnapshot } from "../state";

export const demoJobsAdapter: JobProviderAdapter = {
  snapshotJob(input: JobSnapshotInput) {
    const snapshot = getFlowSnapshot(input.publicId);
    return {
      environment: "local",
      provider: "demo-jobs",
      entityStatus: "found",
      job: snapshot.flow.job,
      flowPublicId: snapshot.flow.publicId,
      project: snapshot.flow.project,
      truthSource: {
        kind: "demo_job_projection",
        provider: "demo-jobs",
        stateOwner: "web-flow-testing-demo",
        tables: ["demo.requests.job", "demo.requests.project"],
      },
    } satisfies JobSnapshot;
  },
};

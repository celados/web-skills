import type {
  PaymentProviderAdapter,
  PaymentSnapshot,
  PaymentSnapshotInput,
} from "./types";

import { getFlowSnapshot } from "../state";

export const demoPaymentAdapter: PaymentProviderAdapter = {
  snapshotOrder(input: PaymentSnapshotInput) {
    const snapshot = getFlowSnapshot(input.publicId);
    const webhookStatus =
      snapshot.flow.order.status === "pending_webhook" ? "pending" : "processed";
    return {
      environment: "local",
      provider: "demo-payment",
      entityStatus: "found",
      order: snapshot.flow.order,
      flowPublicId: snapshot.flow.publicId,
      settlementStatus: snapshot.flow.order.status,
      webhookDelivery: {
        status: snapshot.flow.order.status === "none" ? "not_required" : webhookStatus,
        retryCount: 0,
      },
      truthSource: {
        kind: "demo_payment_projection",
        provider: "demo-payment",
        stateOwner: "web-flow-testing-demo",
        tables: ["demo.requests.order"],
      },
    } satisfies PaymentSnapshot;
  },
};

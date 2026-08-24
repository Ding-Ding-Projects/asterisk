export type AsteriskActionState = "supported" | "implemented-unverified" | "unavailable";

export interface AsteriskActionDefinition {
  id: string;
  family: "module" | "call" | "configuration" | "dialplan" | "media" | "routing" | "security" | "reporting";
  label: string;
  state: AsteriskActionState;
  destructive: boolean;
  confirmation: "required" | "not-required" | "unavailable";
  transport: "control-plane" | "ami" | "ari" | "none";
  unavailableReason?: string;
}

/** Hand-written action boundary. The renderer can show every action without inventing a handler. */
export const ASTERISK_ACTION_CATALOG: ReadonlyArray<AsteriskActionDefinition> = [
  { id: "module.load", family: "module", label: "Load module", state: "implemented-unverified", destructive: false, confirmation: "required", transport: "control-plane" },
  { id: "module.unload", family: "module", label: "Unload module", state: "implemented-unverified", destructive: true, confirmation: "required", transport: "control-plane" },
  { id: "module.reload", family: "module", label: "Reload module", state: "implemented-unverified", destructive: false, confirmation: "required", transport: "control-plane" },
  { id: "configuration.plan", family: "configuration", label: "Preview configuration", state: "supported", destructive: false, confirmation: "not-required", transport: "control-plane" },
  { id: "configuration.apply", family: "configuration", label: "Apply configuration", state: "supported", destructive: true, confirmation: "required", transport: "control-plane" },
  { id: "configuration.restore", family: "configuration", label: "Restore configuration", state: "supported", destructive: true, confirmation: "required", transport: "control-plane" },
  { id: "dialplan.read", family: "dialplan", label: "Read dialplan", state: "supported", destructive: false, confirmation: "not-required", transport: "control-plane" },
  { id: "media.list", family: "media", label: "List media", state: "supported", destructive: false, confirmation: "not-required", transport: "control-plane" },
  { id: "media.upload", family: "media", label: "Upload media", state: "supported", destructive: false, confirmation: "required", transport: "control-plane" },
  { id: "media.remove", family: "media", label: "Remove media", state: "supported", destructive: true, confirmation: "required", transport: "control-plane" },
  { id: "call.hangup", family: "call", label: "Hang up call", state: "implemented-unverified", destructive: true, confirmation: "required", transport: "ami", unavailableReason: "A live AMI credential and target call identifier are required before this action can run." },
  { id: "call.supervise", family: "call", label: "Supervise call", state: "implemented-unverified", destructive: false, confirmation: "not-required", transport: "ari", unavailableReason: "A live ARI application and authenticated WebSocket session are required before supervision can run." },
  { id: "call.record.start", family: "call", label: "Start recording", state: "implemented-unverified", destructive: false, confirmation: "required", transport: "ari", unavailableReason: "A live ARI recording operation is required before recording can run." },
  { id: "call.record.stop", family: "call", label: "Stop recording", state: "implemented-unverified", destructive: true, confirmation: "required", transport: "ari", unavailableReason: "A live ARI recording operation is required before recording can run." },
  { id: "routing.read", family: "routing", label: "Read routes and endpoints", state: "supported", destructive: false, confirmation: "not-required", transport: "control-plane" },
  { id: "security.read", family: "security", label: "Read ACL and security state", state: "supported", destructive: false, confirmation: "not-required", transport: "control-plane" },
  { id: "reporting.read", family: "reporting", label: "Read call and event reports", state: "supported", destructive: false, confirmation: "not-required", transport: "control-plane" },
];

export type AsteriskActionId = (typeof ASTERISK_ACTION_CATALOG)[number]["id"];

export interface AsteriskActionReceipt {
  action: AsteriskActionId;
  state: "accepted" | "refused" | "cancelled" | "timedOut" | "failed";
  observedAt: string;
  requestId: string;
  reason?: string;
}

export function actionDefinition(id: string): AsteriskActionDefinition | undefined {
  return ASTERISK_ACTION_CATALOG.find((action) => action.id === id);
}

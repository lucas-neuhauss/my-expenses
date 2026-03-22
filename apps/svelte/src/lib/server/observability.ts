import { NodeSdk } from "@effect/opentelemetry";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { Effect } from "effect";

export const NodeSdkLive = NodeSdk.layer(() => ({
	resource: { serviceName: "@my-expenses/sveltekit" },
	spanProcessor: new BatchSpanProcessor(new OTLPTraceExporter()),
}));

export const otelEnabled = process.env["OTEL_ENABLED"] === "true";

export const withTelemetry = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
	otelEnabled ? effect.pipe(Effect.provide(NodeSdkLive)) : effect;

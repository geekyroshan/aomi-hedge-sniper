# aomi-hedge-sniper (Rust plugin — production migration target)

This crate is the **typed Rust port** of the analytics layer that currently
lives in `apps/web/lib/{polymarket,correlation,covering-portfolio}.ts`.

## Why this exists, and why it's a stub

The take-home build ships a working end-to-end demo in **two days**. To hit
that timeline I kept the analytics layer in TypeScript inside a Next.js API
route — that's the path that lets a stranger clone, `pnpm install`, and see
a hedge in <5 minutes.

This crate is the **honest migration path** the README's roadmap section
points to. When AOMI runs Hedge Sniper as a hosted plugin in production:

1. The TS analytics layer is replaced by `find_hedge` here, exposed as a
   typed `DynAomiTool` with compile-time-validated params.
2. The hosted runtime hot-loads this crate via `aomi-sdk`'s FFI (`ffi.rs`),
   no rebuild of the runtime needed.
3. The widget (`<AomiFrame/>`) calls `find_hedge` like any other tool — same
   surface, no client-side change.

## Current state

- `Cargo.toml` declares the dependency on `aomi-sdk` (gated behind the
  `plugin` feature flag — disabled by default so `cargo check` works without
  the SDK present).
- `src/types.rs` mirrors `apps/web/lib/types.ts` field-for-field. A
  type-driven port: when this compiles against `aomi-sdk`'s `U256`/`Address`
  primitives, the TS implementation can be deleted.
- `src/tool.rs` declares the `find_hedge` tool signature and a TODO body.
- `src/lib.rs` registers the plugin manifest with `dyn_aomi_app!`.

## Building

```bash
cd rust-plugin
cargo check                     # compiles the stub without aomi-sdk
cargo check --features plugin   # requires aomi-sdk crate available
```

If `cargo check --features plugin` fails because `aomi-sdk` isn't published
to crates.io: that's the expected blocker. The git source in `Cargo.toml`
points at the public repo; once Roshan has push access to a local checkout,
swap the `git = ...` for `path = "../../aomi-sdk"`.

## Roadmap

- [ ] Port `polymarket.ts` (Gamma + CLOB clients) to `client.rs` using
      `reqwest`.
- [ ] Port `correlation.ts` to `correlation.rs` — keep the OpenAI call,
      switch from JS `fetch` to `reqwest`.
- [ ] Port `covering-portfolio.ts` to a pure-Rust `portfolio.rs`.
- [ ] Wire `find_hedge` end-to-end and run the integration tests in
      `apps/polymarket/src/testing.rs`-style harness.
- [ ] Publish the compiled `.dylib`/`.so` to AOMI's plugin registry.

The honest commit message on the day this lands: *"Hedge Sniper analytics
moved from TS API route to typed Rust plugin. The agent's tool surface is
unchanged."*

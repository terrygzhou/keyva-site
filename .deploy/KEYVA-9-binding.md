# KEYV-9 — bind the local server to keva-test.eywalink.org

Goal: reach the local keyva-site test server (static Astro build on
`0.0.0.0:8765` via `.deploy/serve.cjs`) at `keva-test.eywalink.org` so the
owner can verify the site on a fixed test hostname.

## How

The `eywalink.org` zone is managed in Cloudflare and the box runs a persistent
`cloudflared` named tunnel (tunnel id in `~/.cloudflared/config.yml`, running
as the `cloudflared` system service). The Cloudflare API token pulled from
OpenBao (`secret/cloudflare/api_token`, `CF` field) carries
`Worker Scripts:Write` but **no** `Zone DNS` / `Account Settings:Edit`
scoping, and `worker_subdomain` / `custom_domain` APIs 404 for this account
plan, so the binding is done through the tunnel rather than a zone record or
custom worker domain:

`~/.cloudflared/config.yml` ingress (inserted before the `http_status:404`
catch-all):

```yaml
  # 2026-10-31 KEYV-9: local keyva-site test server (0.0.0.0:8765) behind
  # keva-test.eywalink.org so the site is reachable on the test hostname.
  - hostname: keva-test.eywalink.org
    service: http://127.0.0.1:8765
```

## Prerequisites / remaining external steps

- `keva-test.eywalink.org` must resolve to the tunnel's edge. Either point a
  CNAME record `keva-test` at the tunnel ingress (DNS record) or use a
  Cloudflare proxy record — this needs the zone's DNS API, which the OpenBao
  `cloudflare/api_token` token does not cover. Until then the local server
  works at `http://127.0.0.1:8765` and `curl -H "Host: keva-test.eywalink.org"`.
- The static build is served by `node .deploy/serve.cjs` (port 8765, overridable
  with `KEYVA_PORT`). Logs: `.deploy/serve.log`.

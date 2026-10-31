# KEYV-9 — bind the local server to keyva-test.eywalink.org

Goal: reach the local keyva-site test server (static Astro build on
`0.0.0.0:8765` via `.deploy/serve.cjs`) at `keyva-test.eywalink.org` so the
owner can verify the site on a fixed test hostname.

## Status: LIVE

`https://keyva-test.eywalink.org/` → 200, full KEYVA site.

## How it works

### 1. DNS record

A CNAME record was created via the Cloudflare API (token from OpenBao
`secret/cloudflare/dns-eywalink`, `value` field — a DNS-scoped token that
sees the `eywalink.org` zone):

```
keyva-test.eywalink.org CNAME → a58c16f6-1645-4901-8657-76ab944eb4c6.cfargotunnel.com
```

This follows the same pattern as `console`, `control`, `umami`, `track`,
`matomo`, `probe`, `www`, and the tunnel's own CNAME on the zone.

### 2. Cloudflare tunnel ingress

`~/.cloudflared/config.yml` ingress (inserted before the `http_status:404`
catch-all, same file used by the `cloudflared-tunnel` systemd service):

```yaml
  # 2026-10-31 KEYV-9: local keyva-site test server (0.0.0.0:8765) behind
  # keyva-test.eywalink.org so the site is reachable on the test hostname.
  - hostname: keyva-test.eywalink.org
    service: http://127.0.0.1:8765
```

### 3. Local static server

`node .deploy/serve.cjs` (port 8765, overridable with `KEYVA_PORT`).
Logs: `.deploy/serve.log`. Serves the Astro `dist/` build with clean URL
routing (`/` → en, `/zh/…` → zh).

## OpenBao secrets used

| Secret path                   | Policy used         | Purpose                          |
|-------------------------------|--------------------|----------------------------------|
| `cloudflare/dns-eywalink`     | `cloudflare-agent` | DNS-scoped CF token (zone CRUD)  |
| `cloudflare/account-id`       | `cloudflare-admin` | CF account id (reference)        |

Mint short-lived agent tokens via:
```
~/.openbao/bin/mint-agent-token cloudflare-agent 1h keyv9-software-engineer
BAO_ADDR=http://127.0.0.1:8200 BAO_TOKEN=s.xxx \
    python3 ~/.openbao/bin/openbao_agent_fetch.py cloudflare/dns-eywalink value
```

## Restart procedure

If the `cloudflared-tunnel` service needs a restart after a config change:
```
sudo kill -9 $(pgrep -f "cloudflared.*config.yml")
# systemd Restart=always brings it back up within ~5s
```

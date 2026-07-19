# 🚀 Relay Proxy

Bypass internet restrictions using GitHub as a relay proxy.

## How It Works

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Your Browser   │────▶│  Relay Proxy    │────▶│  GitHub         │
│  (localhost:    │◀────│  (local)        │◀────│  (relay)        │
│   8080)         │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                                                         ▼
                                                ┌─────────────────┐
                                                │  Target Website │
                                                │  (any URL)      │
                                                └─────────────────┘
```

## Quick Start

### 1. Install

```bash
npm install -g relay-proxy
# or
npx relay-proxy
```

### 2. Run

```bash
relay-proxy --token ghp_YOUR_TOKEN --repo owner/repo
```

### 3. Configure Browser

Set your browser's HTTP proxy to:
- **Host:** `localhost`
- **Port:** `8080`

Or use with curl:
```bash
curl -x http://localhost:8080 https://example.com
```

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--token, -t` | GitHub personal access token | Required |
| `--repo, -r` | GitHub repository (owner/repo) | Required |
| `--port, -p` | Local proxy port | 8080 |
| `--poll-interval` | Poll interval (ms) | 2000 |
| `--timeout` | Request timeout (ms) | 60000 |

## Requirements

1. **GitHub Token** with `repo` scope
2. **GitHub Repository** with Actions enabled
3. **Node.js** >= 14.0.0

## Setup Repository

1. Create a new GitHub repository
2. Enable GitHub Actions (Settings → Actions → General)
3. Copy `.github/workflows/relay.yml` to your repo
4. Push the workflow file

## Performance

- **Latency:** ~5-30 seconds per request (GitHub Action overhead)
- **Throughput:** Limited by GitHub Actions concurrency
- **Best for:** API calls, data fetching, downloads
- **Not suitable for:** Real-time browsing, streaming

## License

MIT

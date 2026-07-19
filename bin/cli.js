#!/usr/bin/env node

const RelayProxy = require('../src/index.js');

const args = process.argv.slice(2);
const options = {
  port: 8080,
  pollInterval: 2000,
  timeout: 60000
};

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--port':
    case '-p':
      options.port = parseInt(args[++i], 10);
      break;
    case '--token':
    case '-t':
      options.token = args[++i];
      break;
    case '--repo':
    case '-r':
      options.repo = args[++i];
      break;
    case '--poll-interval':
      options.pollInterval = parseInt(args[++i], 10);
      break;
    case '--timeout':
      options.timeout = parseInt(args[++i], 10);
      break;
    case '--help':
    case '-h':
      console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                    🚀 Relay Proxy                            ║
║         Bypass internet restrictions via GitHub              ║
╚═══════════════════════════════════════════════════════════════╝

Usage:
  relay-proxy --token <github_token> --repo <owner/repo> [options]

Options:
  --token, -t      GitHub personal access token (required)
  --repo, -r       GitHub repository in owner/repo format (required)
  --port, -p       Local proxy port (default: 8080)
  --poll-interval  Poll interval in ms (default: 2000)
  --timeout        Request timeout in ms (default: 60000)
  --help, -h       Show this help message

Examples:
  relay-proxy --token ghp_xxx --repo user/repo
  relay-proxy -t ghp_xxx -r user/repo -p 3128

How it works:
  1. Starts a local HTTP proxy on the specified port
  2. Forwards requests through GitHub's infrastructure
  3. Uses GitHub Actions to process and relay traffic
      `);
      process.exit(0);
      break;
    default:
      // Skip unknown options
      break;
  }
}

if (!options.token || !options.repo) {
  console.error('Error: --token and --repo are required');
  console.error('Run with --help for usage information');
  process.exit(1);
}

console.log('\nInitializing Relay Proxy...');
const proxy = new RelayProxy(options);
proxy.start().catch(error => {
  console.error('Failed to start proxy:', error.message);
  process.exit(1);
});

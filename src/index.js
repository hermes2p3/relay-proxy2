const http = require('http');
const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

class RelayProxy {
  constructor(options = {}) {
    this.port = options.port || 8080;
    this.token = options.token;
    this.repo = options.repo;
    this.pollInterval = options.pollInterval || 2000;
    this.timeout = options.timeout || 60000;
    this.maxRetries = options.maxRetries || 3;
    this.requestCount = 0;
  }

  async start() {
    if (!this.token || !this.repo) {
      throw new Error('GitHub token and repo are required');
    }

    const server = http.createServer(async (req, res) => {
      await this.handleRequest(req, res);
    });

    server.listen(this.port, '0.0.0.0', () => {
      console.log(`\n🚀 Relay Proxy Server`);
      console.log(`   Listening: http://localhost:${this.port}`);
      console.log(`   GitHub:    ${this.repo}`);
      console.log(`   Timeout:   ${this.timeout}ms`);
      console.log(`   Polling:   ${this.pollInterval}ms\n`);
    });

    server.on('error', (err) => {
      console.error('Server error:', err.message);
    });
  }

  async handleRequest(clientReq, clientRes) {
    const requestId = crypto.randomUUID();
    const startTime = Date.now();
    this.requestCount++;

    try {
      const body = await this.collectBody(clientReq);
      
      const fullUrl = clientReq.url.startsWith('http') 
        ? clientReq.url 
        : `http://${clientReq.headers.host || 'localhost'}${clientReq.url}`;

      const request = {
        id: requestId,
        method: clientReq.method,
        url: fullUrl,
        headers: clientReq.headers,
        body: body,
        timestamp: Date.now()
      };

      console.log(`[${requestId.substring(0,8)}] → ${clientReq.method} ${clientReq.url.substring(0,60)}...`);

      await this.createGitHubFile(`requests/${requestId}.json`, request);
      const response = await this.pollForResponse(requestId);
      const elapsed = Date.now() - startTime;

      console.log(`[${requestId.substring(0,8)}] ← ${response.statusCode} (${elapsed}ms)`);

      const responseHeaders = response.headers || {};
      responseHeaders['x-relay-id'] = requestId;
      responseHeaders['x-relay-time'] = `${elapsed}ms`;

      clientRes.writeHead(response.statusCode, responseHeaders);
      clientRes.end(response.body || '');

    } catch (error) {
      const elapsed = Date.now() - startTime;
      console.error(`[${requestId.substring(0,8)}] ✗ Error: ${error.message} (${elapsed}ms)`);
      
      clientRes.writeHead(502, { 'Content-Type': 'application/json' });
      clientRes.end(JSON.stringify({
        error: 'Relay proxy error',
        message: error.message,
        requestId: requestId
      }));
    }
  }

  collectBody(req) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      req.on('data', chunk => chunks.push(chunk));
      req.on('end', () => resolve(Buffer.concat(chunks).toString()));
      req.on('error', reject);
      setTimeout(() => resolve(''), 1000);
    });
  }

  async createGitHubFile(filePath, data) {
    const content = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');
    const url = `https://api.github.com/repos/${this.repo}/contents/${filePath}`;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Accept': 'application/vnd.github+json',
            'Content-Type': 'application/json',
            'X-GitHub-Api-Version': '2022-11-28'
          },
          body: JSON.stringify({
            message: `Relay: ${data.method} ${data.url.substring(0, 50)}`,
            content: content
          })
        });

        if (response.ok) {
          return await response.json();
        }

        const errorText = await response.text();
        if (attempt === this.maxRetries) {
          throw new Error(`GitHub API ${response.status}: ${errorText.substring(0, 200)}`);
        }
      } catch (error) {
        if (attempt === this.maxRetries) throw error;
      }
      
      await this.sleep(1000 * attempt);
    }
  }

  async pollForResponse(requestId) {
    const filePath = `responses/${requestId}.json`;
    const startTime = Date.now();

    while (Date.now() - startTime < this.timeout) {
      try {
        const url = `https://api.github.com/repos/${this.repo}/contents/${filePath}`;
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28'
          }
        });

        if (response.ok) {
          const data = await response.json();
          const content = Buffer.from(data.content, 'base64').toString();
          const result = JSON.parse(content);
          
          await this.deleteGitHubFile(filePath, data.sha).catch(() => {});
          return result;
        }
      } catch (error) {
        // Continue polling
      }

      await this.sleep(this.pollInterval);
    }

    throw new Error(`Timeout after ${this.timeout}ms waiting for response`);
  }

  async deleteGitHubFile(filePath, sha) {
    const url = `https://api.github.com/repos/${this.repo}/contents/${filePath}`;
    await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28'
      },
      body: JSON.stringify({
        message: `Cleanup: ${filePath}`,
        sha: sha
      })
    });
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = RelayProxy;

const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');

const PORT = process.env.PORT || 8080;
const PUBLIC_DIR = __dirname;

const MIME_TYPES = {
    '.html': 'text/html; charset=UTF-8',
    '.css': 'text/css; charset=UTF-8',
    '.js': 'text/javascript; charset=UTF-8',
    '.json': 'application/json; charset=UTF-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.xml': 'application/xml',
    '.txt': 'text/plain'
};

const ipCache = new Map();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

let releasesCache = { data: null, timestamp: 0 };
const RELEASES_CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

const server = http.createServer((req, res) => {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    let pathname = parsedUrl.pathname;

    // Handle /api/releases route
    if (pathname === '/api/releases') {
        const now = Date.now();
        if (releasesCache.data && (now - releasesCache.timestamp < RELEASES_CACHE_TTL)) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(releasesCache.data);
            return;
        }

        const ghReq = https.get('https://api.github.com/repos/d0x-dev/AirBeats/releases', {
            headers: {
                'User-Agent': 'AirBeats-Server/1.0',
                'Accept': 'application/vnd.github.v3+json'
            }
        }, (ghRes) => {
            let data = '';
            ghRes.on('data', chunk => { data += chunk; });
            ghRes.on('end', () => {
                if (ghRes.statusCode === 200) {
                    releasesCache = { data, timestamp: Date.now() };
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(data);
                } else {
                    if (releasesCache.data) {
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(releasesCache.data);
                    } else {
                        res.writeHead(ghRes.statusCode, { 'Content-Type': 'application/json' });
                        res.end(data);
                    }
                }
            });
        });

        ghReq.on('error', () => {
            if (releasesCache.data) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(releasesCache.data);
            } else {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Failed to fetch releases' }));
            }
        });
        return;
    }

    // Handle /api/submit route matching worker.js
    if (pathname === '/api/submit' || (req.method === 'POST' && pathname.endsWith('/submit'))) {
        if (req.method !== 'POST') {
            res.writeHead(405, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, message: 'Method not allowed. Use POST.' }));
            return;
        }

        const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
        const now = Date.now();
        let ipData = ipCache.get(clientIP) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW_MS };

        if (now > ipData.resetTime) {
            ipData.count = 0;
            ipData.resetTime = now + RATE_LIMIT_WINDOW_MS;
        }

        if (ipData.count >= RATE_LIMIT_MAX) {
            const remainingMinutes = Math.ceil((ipData.resetTime - now) / (60 * 1000));
            res.writeHead(429, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                message: `Rate limit exceeded. Maximum 5 messages per hour allowed per IP address. Please try again in ${remainingMinutes} minute(s).`
            }));
            return;
        }

        let bodyText = '';
        req.on('data', chunk => { bodyText += chunk.toString(); });
        req.on('end', () => {
            let payload;
            try {
                payload = JSON.parse(bodyText);
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: 'Invalid JSON payload.' }));
                return;
            }

            payload.access_key = payload.access_key || "359251f7-72a8-4d76-8b5e-b9b43bebb3a3";

            const postData = JSON.stringify(payload);
            const apiReq = https.request('https://api.web3forms.com/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Content-Length': Buffer.byteLength(postData)
                }
            }, (apiRes) => {
                let apiData = '';
                apiRes.on('data', chunk => { apiData += chunk.toString(); });
                apiRes.on('end', () => {
                    if (apiRes.statusCode >= 200 && apiRes.statusCode < 300) {
                        ipData.count += 1;
                        ipCache.set(clientIP, ipData);
                    }
                    res.writeHead(apiRes.statusCode, { 'Content-Type': 'application/json' });
                    res.end(apiData);
                });
            });

            apiReq.on('error', (err) => {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: 'Internal server error proxying request.' }));
            });

            apiReq.write(postData);
            apiReq.end();
        });
        return;
    }

    // Static File Serving
    let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);

    // Prevent directory traversal
    if (!filePath.startsWith(PUBLIC_DIR)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('403 Forbidden');
        return;
    }

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            if (fs.existsSync(filePath + '.html') && fs.statSync(filePath + '.html').isFile()) {
                filePath = filePath + '.html';
            } else if (fs.existsSync(path.join(PUBLIC_DIR, 'index.html'))) {
                if (err && err.code === 'ENOENT' && !path.extname(pathname)) {
                    filePath = path.join(PUBLIC_DIR, 'index.html');
                } else {
                    res.writeHead(404, { 'Content-Type': 'text/html' });
                    res.end('<h1>404 Not Found</h1>');
                    return;
                }
            } else {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 Not Found</h1>');
                return;
            }
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        fs.readFile(filePath, (readErr, data) => {
            if (readErr) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('500 Internal Server Error');
                return;
            }
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(data);
        });
    });
});

server.listen(PORT, () => {
    console.log(`\n==================================================`);
    console.log(`🚀 AirBeats local server running successfully!`);
    console.log(`🔗 Local URL: http://localhost:${PORT}`);
    console.log(`🔗 Network URL: http://127.0.0.1:${PORT}`);
    console.log(`==================================================\n`);
});

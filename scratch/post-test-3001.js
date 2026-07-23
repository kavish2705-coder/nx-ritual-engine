const http = require('http');

const postData = JSON.stringify({
  userId: 'KavishTestOnboarding',
  sessions: [],
  traits: { avoidance: 0, overthinking: 0, inconsistency: 0, stressResponse: 0 },
  totalEntries: 0,
  flameState: 'stable',
  sessionCount: 0,
  patterns: [],
  behavioralPatterns: [],
  discrepancyLog: [],
  knownFacts: []
});

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/memory',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  console.log('Status Code:', res.statusCode);
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Body:', data);
  });
});

req.on('error', (err) => {
  console.error('Request Error:', err);
});

req.write(postData);
req.end();

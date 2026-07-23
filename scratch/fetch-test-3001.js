const http = require('http');

http.get('http://localhost:3001/api/memory?userId=Kavish', (res) => {
  console.log('Status Code:', res.statusCode);
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Body:', data);
  });
}).on('error', (err) => {
  console.error('Fetch Error:', err);
});

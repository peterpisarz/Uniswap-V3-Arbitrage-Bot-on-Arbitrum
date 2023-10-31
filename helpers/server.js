const express = require('express')
const path = require('path')
const http = require('http')
const cors = require('cors')
const fs = require('fs');

// SERVER CONFIG
const PORT = process.env.PORT || 5000
const app = express();
const server = http.createServer(app).listen(PORT, () => console.log(`Listening on ${PORT}\n`))
app.use(express.static(path.join(__dirname, 'public')))
app.use(cors({ credentials: true, origin: '*' }))

// Serve the chart.html file with injected data
app.get('/chart', (req, res) => {
  // Read the chart.html file
  const chartHtml = fs.readFileSync(path.join(__dirname, '..', 'chart.html'), 'utf8');

  // Inject the data into the HTML
  const updatedHtml = chartHtml
    .replace('INSERT_INPUT_VALUES', JSON.stringify(inputValues))
    .replace('INSERT_DIFF_VALUES', JSON.stringify(diffValues));

  // Send the updated HTML as the response
  res.send(updatedHtml);

});

// This function is called from analyze.js to pass the data to server.js
module.exports = (inputValues, diffValues) => {
  global.inputValues = inputValues; // Make inputValues globally available
  global.diffValues = diffValues; // Make diffValues globally available
};

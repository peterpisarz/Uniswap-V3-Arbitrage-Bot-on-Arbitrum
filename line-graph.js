const plotly = require('plotly')('your-username', 'your-api-key'); // You need to replace 'your-username' and 'your-api-key' with your Plotly credentials

// Sample data
const data = [
  {
    x: [1, 2, 3, 4, 5],
    y: [10, 11, 9, 12, 13],
    type: 'scatter',
    mode: 'lines',
    name: 'Line Chart',
  },
];

// Graph layout
const layout = {
  title: 'Simple Line Chart',
  xaxis: {
    title: 'X-Axis Label',
  },
  yaxis: {
    title: 'Y-Axis Label',
  },
};

// Create the graph
plotly.plot(data, layout, function (err, msg) {
  if (err) return console.error(err);
  console.log(msg.url);
});

import matplotlib.pyplot as plt
import pandas as pd

# Load the data from the CSV file
data = pd.read_csv('data.csv')

# Extract input and diff values
input_values = data['input']
diff_values = data['diff']

# Create a line chart
plt.plot(input_values, diff_values, label='Difference')

# Customize the chart (e.g., labels, title, etc.)
plt.xlabel('Input')
plt.ylabel('Difference')
plt.title('Input vs Difference Chart')
plt.grid(True)
plt.legend()

# Show the chart or save it to a file
plt.show()
plt.savefig('/mnt/c/pr0/poly-bot/input_vs_diff.png')
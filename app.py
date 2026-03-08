from flask import Flask, render_template, request
import duckdb

app = Flask(__name__)
continuous_columns = ['humidity', 'temp', 'wind']
discrete_columns = ['day']
months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]
sorted_months = sorted(months)

@app.route('/')
def index():
    scatter_ranges_query = f'SELECT MIN(X), MAX(X), MIN(Y), MAX(Y) FROM forestfires.csv' # Retrieves the minimum and maximum X and Y coordinates
    scatter_ranges_results = duckdb.sql(scatter_ranges_query).df()
    minX, minY, maxX, maxY = scatter_ranges_results['min(X)'], scatter_ranges_results['min(Y)'], scatter_ranges_results['max(X)'], scatter_ranges_results['max(Y)']
    scatter_ranges = [float(minX[0]), float(maxX[0]), float(minY[0]), float(maxY[0])] 
    
    max_count_query = 'SELECT COUNT(MONTH) FROM forestfires.csv GROUP BY MONTH ORDER BY COUNT(MONTH) DESC' 
    max_count_results = duckdb.sql(max_count_query).df()
    max_count =  int(max_count_results['count("MONTH")'][0]) 

    filter_ranges_query = f'SELECT MIN(humidity), MAX(humidity), MIN(temp), MAX(temp), MIN(wind), MAX(wind) FROM forestfires.csv' 
    filter_ranges_results = duckdb.sql(filter_ranges_query).df()
    filter_ranges_results.info()
    min_humidity, max_humidity, min_temp, max_temp, min_wind, max_wind = filter_ranges_results['min(humidity)'], filter_ranges_results['max(humidity)'], filter_ranges_results['min("temp")'], filter_ranges_results['max("temp")'], filter_ranges_results['min(wind)'], filter_ranges_results['max(wind)']
    
    filter_ranges = {
    "humidity": (int(min_humidity[0]), float(max_humidity[0])),
    "temp": (float(min_temp[0]), float(max_temp[0])),
    "wind": (float(min_wind[0]), float(max_wind[0])) 
    }

    return render_template(
        'index.html', months=months, days=days,
        filter_ranges=filter_ranges, scatter_ranges=scatter_ranges, max_count=max_count
    )

@app.route('/update', methods=["POST"])
def update():
    request_data = request.get_json()
    continuous_predicate = ' AND '.join([f'({column} >= {request_data[column][0]} AND {column} <= {request_data[column][1]})' for column in continuous_columns]) # update where clause from sliders
    selected_days = request_data['day']
    day_values = ', '.join([f"'{d}'" for d in selected_days])
    discrete_predicate = f"day IN ({day_values})" if selected_days else "1=0"
    predicate = ' AND '.join([continuous_predicate, discrete_predicate]) # Combine where clause from sliders and checkboxes

    scatter_query = f'SELECT X, Y FROM forestfires.csv WHERE {predicate}'
    scatter_results = duckdb.sql(scatter_query).df()
    # Extract the data that will populate the scatter plot
    scatter_data = [{'x': float(row['X']), 'y': float(row['Y'])} for _, row in scatter_results.iterrows()]

    bar_query = f'SELECT month, COUNT(*) FROM forestfires.csv WHERE {predicate} GROUP BY MONTH ORDER BY MONTH'
    bar_results = duckdb.sql(bar_query).df()
    bar_results['month'] = bar_results.index.map({i: sorted_months[i] for i in range(len(sorted_months))})
    print(bar_results)
    bar_data = [{'x': row['month'], 'y': int(row['count_star()'])} for _, row in bar_results.iterrows()] 
    max_count = bar_results['count_star()'].max() if not bar_results.empty else 0 

    print(max_count)

    return {'scatter_data': scatter_data, 'bar_data': bar_data, 'max_count': max_count}

if __name__ == "__main__":
    app.run(debug=True)
    
function draw_svg(container_id, margin, width, height){
    svg = d3.select("#"+container_id)
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .style("background-color", "#dbdad7")
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    return svg
}

function draw_xaxis(plot_name, svg, height, scale){
    svg.append("g")
        .attr('class', plot_name + "-xaxis")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(scale).tickSize(0))
}

function draw_yaxis(plot_name, svg, scale){
    svg.append("g")
        .attr('class', plot_name + "-yaxis")
        .call(d3.axisLeft(scale));
}

function draw_axis(plot_name, axis, svg, height, domain, range, discrete){
    if (discrete){
        var scale = d3.scaleBand()
            .domain(domain)
            .range(range)
            .padding([0.2])
    } else {
        var scale = d3.scaleLinear()
            .domain(domain)
            .range(range);
    }
    if (axis=='x'){
        draw_xaxis(plot_name, svg, height, scale)
    } else if (axis=='y'){
        draw_yaxis(plot_name, svg, scale)
    }
    return scale
}

function draw_axes(plot_name, svg, width, height, domainx, domainy, x_discrete){
    var x_scale = draw_axis(plot_name, 'x', svg, height, domainx, [0, width], x_discrete)
    var y_scale = draw_axis(plot_name, 'y', svg, height, domainy, [height, 0], false)
    return {'x': x_scale, 'y': y_scale}
}

function draw_slider(column, min, max, scatter_svg, bar_svg, scatter_scale, bar_scale){
    slider = document.getElementById(column+'-slider')
    noUiSlider.create(slider, {
      start: [min, max],
      connect: false,
          tooltips: true,
      step: 1,
      range: {'min': min, 'max': max}
    });
    slider.noUiSlider.on('change', function(){
        update(scatter_svg, bar_svg, scatter_scale, bar_scale)
    });
}

//function that draws the scatterplot
function draw_scatter(data, svg, scale){
    //console.log("scatter data", data);
    svg.selectAll("circle")
        .data(data)
        .enter()
        .append("circle")
        .attr("cy", d => scale.y(d.y))
        .attr("cx", d=> scale.x(d.x))
        .attr("r", 3)
        .attr("fill", "#B22122")
        .attr("stroke", "black")
        .attr("stroke-width", 1);
}

// function that updates the bar
function draw_bar(data, svg, scale){
    console.log(data); 

    // draw the rectangles / bars 
    svg.selectAll("rect")
        .data(data)
        .enter()
        .append("rect")
        .attr("y", d => scale.y(d.y))
        .attr("x", d=> scale.x(d.x))
        .attr("width", scale.x.bandwidth())
        .attr("height", d => scale.y(0) - scale.y(d.y))
        .attr("fill", "#4682B4"); 

}

// function that extracts the selected days and minimum/maximum values for each slider
function get_params(){
    var day = [];
    d3.selectAll(".checkboxDays:checked").each(function(){
        day.push(this.value);
    })
    var humidity = document.getElementById("humidity-slider").noUiSlider.get().map(Number);
    var temp = document.getElementById("temp-slider").noUiSlider.get().map(Number);
    var wind = document.getElementById("wind-slider").noUiSlider.get().map(Number);

    console.log(day);
    return {'day': day, 'humidity': humidity, 'temp': temp, 'wind': wind}
}

// function that removes the old data points and redraws the scatterplot
function update_scatter(data, svg, scale){
    svg.selectAll("circle").remove();
    draw_scatter(data, svg, scale);
}

// function that removes the old bars, redraws the y-axis, and redraws the bar chart 
function update_bar(data, max_count, svg, scale){
    // remove all old bars 
    svg.selectAll("rect").remove();
    
    // re-scale the y-axis 
    scale.y.domain([0, max_count]); // fix the domain so that it only goes up to the new max count 
    svg.selectAll('.bar-yaxis').call(d3.axisLeft(scale.y)); // call the y-axis function on the given y scale

    // redraw the bars 
    draw_bar(data, svg, scale); 
}

function update(scatter_svg, bar_svg, scatter_scale, bar_scale){
    params = get_params()
    fetch('/update', {
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify(params),
        cache: 'no-cache',
        headers: new Headers({
            'content-type': 'application/json'
        })
    }).then(async function(response){
        var results = JSON.parse(JSON.stringify((await response.json())))
    
        update_scatter(results['scatter_data'], scatter_svg, scatter_scale)
        update_bar(results['bar_data'], results['max_count'], bar_svg, bar_scale)
    })
}

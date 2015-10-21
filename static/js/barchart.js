function drawchart() {
  //<label><input type="checkbox"> Sort values</label>
  var margin = {top: 20, right: 20, bottom: 30, left: 40},
      width = 1120 - margin.left - margin.right,
      height = 500 - margin.top - margin.bottom;

  var formatPercent = d3.format(".0%");

  var x = d3.scale.ordinal()
      .rangeRoundBands([0, width], .1, 1);

  var y = d3.scale.linear()
      .range([height, 0]);

  var xAxis = d3.svg.axis()
      .scale(x)
      .orient("bottom");

  var yAxis = d3.svg.axis()
      .scale(y)
      .orient("left")
      .tickFormat(formatPercent);

  // remove any old svg
  d3.select("svg").remove();
  d3.select("#svg-container").select("label").remove();
  checkbox = d3.select("#svg-container").append("label");
  checkbox.append("input").attr("type", "checkbox");
  checkbox.append("text").text("Sort");

  var svg = d3.select("#svg-container").append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
    .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var tooltip = Tooltip("vis-tooltip", 230)

  d3.json("http://10.240.176.237:5000/datachart", function(error, d) {
    var data = d.values;
    data.forEach(function(d) {
      d.frequency = +d.frequency;
    });

    x.domain(data.map(function(d) { return d.letter; }));
    y.domain([0, d3.max(data, function(d) { return d.frequency; })]);

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);
	/*
		.selectAll("text")
      		.style("text-anchor", "end")
      		.attr("dx", "-.8em")
		.attr("dy", "-.55em")
		.attr("transform", "rotate(-90)" );
	*/

    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis)
      .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text("Frequency");

    var bars = svg.selectAll(".bar")
        .data(data);

    bars.enter().append("rect")
        .attr("class", "bar")
        .attr("x", function(d) { return x(d.letter); })
        .attr("width", x.rangeBand())
        .attr("y", function(d) { return y(d.frequency); })
        .attr("height", function(d) { return height - y(d.frequency); });

    bars.on("mouseover", barDetails)
	.on("mouseout", hideDetails);

    d3.select("input").on("change", change);

    var sortTimeout = setTimeout(function() {
      d3.select("input").property("checked", true).each(change);
    }, 2000);

    function change() {
      clearTimeout(sortTimeout);

      // Copy-on-write since tweens are evaluated after a delay.
      var x0 = x.domain(data.sort(this.checked
          ? function(a, b) { return b.frequency - a.frequency; }
          : function(a, b) { return d3.ascending(a.letter, b.letter); })
          .map(function(d) { return d.letter; }))
          .copy();

      svg.selectAll(".bar")
          .sort(function(a, b) { return x0(a.letter) - x0(b.letter); });

      var transition = svg.transition().duration(750),
          delay = function(d, i) { return i * 50; };

      transition.selectAll(".bar")
          .delay(delay)
          .attr("x", function(d) { return x0(d.letter); });

      transition.select(".x.axis")
          .call(xAxis)
        .selectAll("g")
          .delay(delay);
    }


   function barDetails(d,i) {
     var content = '<p class="main">' + d.letter + '</span></p>';
     content += '<hr class="tooltip-hr">';
     content += '<p class="extra">' + Number((d.frequency*100).toFixed(2)) + '<b>&#37</b></span></p>';
     tooltip.showTooltip(content,d3.event,d.letter.length>30?d.letter.length/30:1);
    } 

   function hideDetails(d,i) {
     tooltip.hideTooltip();
   }
  });
  return false;
}

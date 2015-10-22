function drawchart(elementId) {
  if ('chart' in drawchart) {
      drawchart.chart = "a";
      console.log("drawchart.charted");
      datachange(elementId);
      return false;
    }

  console.log("drawchart.chart");
//<label><input type="checkbox"> Sort values</label>
  var margin = {top: 20, right: 20, bottom: 30, left: 40};
  drawchart.width = 1120 - margin.left - margin.right;
  drawchart.height = 500 - margin.top - margin.bottom;

  var formatPercent = d3.format(".0%");

  drawchart.x = d3.scale.ordinal()
      .rangeRoundBands([0, drawchart.width], .1, 1);

  drawchart.y = d3.scale.linear()
      .range([drawchart.height, 0]);

  drawchart.xAxis = d3.svg.axis()
      .scale(drawchart.x)
      .orient("bottom");

  drawchart.yAxis = d3.svg.axis()
      .scale(drawchart.y)
      .orient("left")
      .tickFormat(formatPercent);

  drawchart.tooltip = Tooltip("vis-tooltip", 230)

  // remove any old svg
  d3.select("svg").remove();
  d3.select("#svg-container").select("label").remove();
  var checkbox = d3.select("#svg-container").append("label");
  checkbox.append("input").attr("type", "checkbox");
  checkbox.append("text").text("Sort Chart");

  drawchart.svg = d3.select("#svg-container").append("svg")
      .attr("width", drawchart.width + margin.left + margin.right)
      .attr("height", drawchart.height + margin.top + margin.bottom)
    .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
  drawchart.chart = "a";
  datachange(elementId);

  function datachange(elementId) {
    console.log("clicked-.."); d3.event.stopPropagation();
    d3.json("http://10.240.176.237:5000/datachart?field="+elementId, function(error, d) {
        var data = d.values;
        data.forEach(function(d) {
          d.frequency = +d.frequency;
        });

        drawchart.x.domain(data.map(function(d) { return d.letter; }));
        drawchart.y.domain([0, d3.max(data, function(d) { return d.frequency; })]);

        drawchart.svg.select(".y.axis").remove();
        drawchart.svg.select(".x.axis").remove();
        drawchart.svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + drawchart.height + ")")
            .call(drawchart.xAxis);

        drawchart.svg.append("g")
            .attr("class", "y axis")
            .call(drawchart.yAxis)
          .append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 6)
            .attr("dy", ".71em")
            .style("text-anchor", "end")
            .text("Frequency");

        var bar = drawchart.svg.selectAll(".bar")
            .data(data);

        bar.enter().append("rect")
            .attr("class", "bar")
            .attr("x", function(d) { return drawchart.x(d.letter); })
            .attr("width", drawchart.x.rangeBand());
        
        bar.exit().remove();  

        bar.transition().duration(750)
            .attr("y", function(d) { return drawchart.y(d.frequency); })
            .attr("height", function(d) { return drawchart.height - drawchart.y(d.frequency); })

        bar.on("mouseover", barDetails)
          .on("mouseout", hideDetails);

        d3.select("input").on("change", change);

        function change() {

          // Copy-on-write since tweens are evaluated after a delay.
          var x0 = drawchart.x.domain(data.sort(this.checked
              ? function(a, b) { return b.frequency - a.frequency; }
              : function(a, b) { return d3.ascending(a.letter, b.letter); })
              .map(function(d) { return d.letter; }))
              .copy();

          drawchart.svg.selectAll(".bar")
              .sort(function(a, b) { return x0(a.letter) - x0(b.letter); });

          var transition = drawchart.svg.transition().duration(750),
              delay = function(d, i) { return i * 50; };

          transition.selectAll(".bar")
              .delay(delay)
              .attr("x", function(d) { return x0(d.letter); });

          transition.select(".x.axis")
              .call(drawchart.xAxis)
            .selectAll("g")
              .delay(delay);
        }

        function barDetails(d,i) {
         var content = '<p class="main">' + d.letter + '</span></p>';
         content += '<hr class="tooltip-hr">';
         content += '<p class="extra">' + Number((d.frequency*100).toFixed(2)) + '<b>&#37</b></span></p>';
         drawchart.tooltip.showTooltip(content,d3.event,d.letter.length>30?d.letter.length/30:1);
        } 

       function hideDetails(d,i) {
         drawchart.tooltip.hideTooltip();
       }
    });
  }


  return false;
}

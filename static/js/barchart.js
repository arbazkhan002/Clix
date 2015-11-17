function drawchart(elementId) {
  drawchart.elementId = elementId;	
  if ('chart' in drawchart) {
      console.log("drawchart.charted");
      datachange(drawchart.elementId, true);
      return false;
    }

  drawchart.chart = {};
  clearSVG();  
  var margin = {top: 20, right: 20, bottom: 30, left: 40};
  drawchart.chart.width = 1120 - margin.left - margin.right;
  drawchart.chart.height = 500 - margin.top - margin.bottom;

  var formatPercent = d3.format(".0%");

  drawchart.chart.x = d3.scale.ordinal()
      .rangeRoundBands([0, drawchart.chart.width], .1, 1);

  drawchart.chart.y = d3.scale.linear()
      .range([drawchart.chart.height, 0]);

  drawchart.chart.xAxis = d3.svg.axis()
      .scale(drawchart.chart.x)
      .orient("bottom");

  drawchart.chart.yAxis = d3.svg.axis()
      .scale(drawchart.chart.y)
      .orient("left")
      .tickFormat(formatPercent);

  drawchart.chart.tooltip = Tooltip("vis-tooltip", 230)
  drawchart.chart.checkbox = d3.select("#svg-container").append("label");
  drawchart.chart.checkbox.append("input")
	.attr("id", "sort-check")
	.attr("type", "checkbox");
  drawchart.chart.checkbox.append("text").text("Sort Chart");

  drawchart.chart.svg = d3.select("#svg-container").append("svg")
      .attr("width", drawchart.chart.width + margin.left + margin.right)
      .attr("height", drawchart.chart.height + margin.top + margin.bottom)
    .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
  
  datachange(drawchart.elementId, true);

  function redrawChart(d) {
	    var data = d.values,
	    name = drawchart.elementId;
	    var total = 0;
        data.forEach(function(d) {
          d.frequency = +d.frequency;
          total += +d.frequency;
        });
        
		data.forEach(function(d) {
          d.frequency = d.frequency/total;
        });

        drawchart.chart.x.domain(data.sort(function(a, b) { return d3.ascending(a.letter, b.letter); }).map(function(d) { return d.letter; }));
        drawchart.chart.y.domain([0, d3.max(data, function(d) { return d.frequency; })]);

		// remove axes
        drawchart.chart.svg.select(".y.axis").remove();
        drawchart.chart.svg.select(".x.axis").remove();
        drawchart.chart.svg.select(".x.label").remove();    
            
        drawchart.chart.svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + drawchart.chart.height + ")")
            .call(drawchart.chart.xAxis);
            
		drawchart.chart.svg.append("text")
		.attr("class", "x label")
		.attr("text-anchor", "end")
		.attr("x", drawchart.chart.width/2)
		.attr("y", drawchart.chart.height + 16)
		.text(name+" (Top 50 results)"); 

        drawchart.chart.svg.append("g")
            .attr("class", "y axis")
            .call(drawchart.chart.yAxis)
          .append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 6)
            .attr("dy", ".71em")
            .style("text-anchor", "end")
            .text("Frequency");

        var bar = drawchart.chart.svg.selectAll(".bar")
            .data(data);

        bar.enter().append("rect")
            .attr("class", "bar")
            
        bar.exit().remove();  

        bar.transition().duration(500)
			.attr("x", function(d) { return drawchart.chart.x(d.letter); })
            .attr("width", drawchart.chart.x.rangeBand())
            .attr("y", function(d) { return drawchart.chart.y(d.frequency); })
            .attr("height", function(d) { return drawchart.chart.height - drawchart.chart.y(d.frequency); })

        bar.on("mouseover", barDetails)
          .on("mouseout", hideDetails);

		d3.select("#sort-check").property("checked", false)
		.on("change", change);
		
        function change() {
          // Copy-on-write since tweens are evaluated after a delay.
          var x0 = drawchart.chart.x.domain(data.sort(this.checked
              ? function(a, b) { return b.frequency - a.frequency; }
              : function(a, b) { return d3.ascending(a.letter, b.letter); })
              .map(function(d) { return d.letter; }))
              .copy();

		  changeAxisX(x0);
		  filterSort();
        }
        
        function barDetails(d,i) {
		 var extra = '';	
         var content = '<p class="main">' + d.letter + '</span></p>';
		 if (drawchart.elementId == 'CLIENT_ID')
			extra = '<p class="extra">' + d.prop.DISPLAY_NAME + ':' + d.prop.REGION_VIEW_ID + '</span></p>';
		 content += extra;	
         content += '<hr class="tooltip-hr">';
         content += '<p class="extra">' + Number((d.frequency*100).toFixed(2)) + '<b>&#37</b></span></p>';
         var dynamicWidth = Math.max(extra.length*0.6, d.letter.length)>30 ? Math.max(extra.length*0.6, d.letter.length)/30:1;
         drawchart.chart.tooltip.showTooltip(content, d3.event, dynamicWidth);
        } 

       function hideDetails(d,i) {
         drawchart.chart.tooltip.hideTooltip();
       }
  }
  
  function datachange(e, refresh) {
    //d3.event.stopPropagation();
    drawchart.elementId = e;   
	var postData = {},
		context = 'env-filter';
	postData.field = drawchart.elementId;
	console.log(drawchart.elementId);
	postData[window.fieldmap.get(context)] = filters[context];
	
	if (!(typeof(refresh)==='undefined'))
		d3.xhr('/datachart')
			.header("Content-Type", "application/json")
			.post(
				JSON.stringify(postData),
				function(err, data){
					var response = JSON.parse(data.response);
					redrawChart(response);
				}
			);
	var t = drawchart.chart.svg.transition();			
	console.log(t);
	var filterTimeout = setTimeout(function() {
		filterSort();
	}, 1000);	    
  }
  
  function changeAxisX(x0) {
	  drawchart.chart.svg.selectAll(".bar")
		  .sort(function(a, b) { return x0(a.letter) - x0(b.letter); });

	  var transition = drawchart.chart.svg.transition().duration(750),
		  delay = function(d, i) { return i * 5; };

	  transition.selectAll(".bar")
		  .delay(delay)
		  .attr("x", function(d) { return x0(d.letter); });

	  transition.select(".x.axis")
		  .call(drawchart.chart.xAxis)
		.selectAll("g")
		  .delay(delay);
  }
  
  function filterSort() {
  	  function filterCondition(d) {
		  for (var f in filters) {
			field = window.fieldmap.get(f);
			//console.log(d.letter);
			if (d.letter in filters[f])
				return 1;
			
			if (d.prop!=null && d.prop[field] in filters[f])
				return 1;
				
		  }
		  return 0;
	  }
	  
	  var bar = drawchart.chart.svg.selectAll(".bar");
	  bar.attr("visibility", function(d){return filterCondition(d)?"hidden":"visible";});
	  
	  var data = bar.data();
	  
	  // push to the end if any of the chart elements belongs to filters
	  var x0 = drawchart.chart.x.domain(data.sort(function(a,b) {
			if (!filterCondition(a) && !filterCondition(b))
				return d3.select("#sort-check").property("checked")? b.frequency - a.frequency:d3.ascending(a.letter, b.letter);
			else 
				return (filterCondition(a)-filterCondition(b))*100;
			})
		  .map(function(d) { return d.letter; }))
		  .copy();

	  changeAxisX(x0);        
  }
 
  function clearSVG() {	
	  // remove any old svg
	  d3.select("svg").remove();
	  d3.select("#svg-container").select("label").remove();
  }
    
  window.dispatch.on("filterChange", function(context, filters) {
		context == "env-filter" ? datachange(drawchart.elementId, true) : datachange(drawchart.elementId);
  });
  
  return false;
}

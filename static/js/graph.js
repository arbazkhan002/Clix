function drawgraph(session_num, session_id) {
  clearSVG();
  		
  var width = parseInt(d3.select("#svg-container").style("width")),
      height = 500;

  var color = d3.scale.category20();

  var force = d3.layout.force()
      .charge(-120)
      .size([width, height]);
  
  var zoom = d3.behavior.zoom()
      .scaleExtent([.5, 10])
      .on("zoom", zoomed);

  var svg = d3.select("#svg-container").append("svg")
      .attr("width", width)
      .attr("height", height)
      .append("g")
            .call(zoom);

  var rect = svg.append("rect")
      .attr("width", width)
      .attr("height", height)
      .style("fill", "none")
      .style("pointer-events", "all");            

  svg = svg.append("g");          

  var drag = d3.behavior.drag()
      .origin(function(d) { return d; })
      .on("dragstart", dragstarted)
      .on("drag", dragged)
      .on("dragend", dragended);

  var tooltip = Tooltip("vis-tooltip", 230);
  
  // if session_num is 0, loads default graph (currently longest session)
  // else loads graph for session# indexed session_num
 
  d3.xhr('/datagraph')
			.header("Content-Type", "application/json")
			.post(
				JSON.stringify({
					'link': 'COUNT',
					'node': 'COMPONENT_TYPE',
					'num': session_num,
					'ENVIRONMENT': filters['env-filter'],
					'DSID': session_id
					}),
				function(err, data){
					var response = JSON.parse(data.response);
					render_graph(err, response);
				}
			);

  function render_graph(error, graph) {
		if (error) {
		  return console.error(error);
		}
	 
	   var hull = svg.append("g")
		.attr("id", "hullstructs");    
		
	   force
			.nodes(graph.nodes)
			.links(graph.links)
			.linkDistance(function(link, index) { return link.len;});

	  // Per-type markers, as they don't inherit styles.
	  svg.append("defs").selectAll("marker")
		  .data(["licensing", "highlight"])
		.enter().append("marker")
		  .attr("id", function(d) { return d; })
		  .attr("viewBox", "0 -5 10 10")
		  .attr("refX", 15)
		  .attr("refY", -1.5)
		  .attr("markerWidth", 6)
		  .attr("markerHeight", 6)
		  .attr("markerUnits","userSpaceOnUse")
		  .attr("orient", "auto")
		.append("path")
		  .attr("d", "M0,-5L10,0L0,5");

	  var path = svg.append("g").selectAll("path");

	  var circle = svg.selectAll("g.node");

	  startFlow();

	  // wait for transitions to end before you respond to filters (which were already set)
 	  svg.transition().each("end", function() {
	    window.dispatch.filterChange(null, filters);
	  });

	  var linkedByIndex = {};

	  graph.links.forEach(function(d) {
						  if(d.value>0)
							linkedByIndex[d.source.index + "," + d.target.index] = 1;
	  });

	  
	  function startFlow() {
		  // remove self loops (for better representation) and null value links (which were created to introduce cohesion between nodes of same type (e.g., RVID))
		path = path.data(force.links().filter(function(d){return d.value>0 && d.source!=d.target;}), function(d) { return d.source + "-" + d.target; });
		  
		path.enter().append("path")
		  .attr("class", function(d) { return "link licensing"; })
		  .style("stroke-opacity", function(d) { return d.value==0?0:0.6; })
		  .style("stroke-width", function(d) { return (d.value); })    
		  .attr("marker-end", function(d) { return "url(#licensing)"; });
		
		path.exit().transition().remove();   

		circle = circle.data(force.nodes(), function(d){return d.prop.id;});
		  
		circle.enter().append("svg:g")
		  .attr("class", "node")
		  .call(drag)
		  .append("circle") 
		  .attr("r", 6)
		  .style("stroke","#fff")
		  .style("stroke-width", 1.0)
		  .style("fill", function(d) { return color(d.group); });
		
		circle.exit().transition().remove();  

		circle.on("mouseover", nodeDetails)
		.on("mouseout", hideDetails);    
		
		force.on("tick", function() {
			  path.attr("d", linkArc);
			  circle.attr("transform", transform);
			  redrawHulls();})
		  .start();  
		  
	  }

	  // check whether two nodes are connected
	  function isConnected(a, b) {
		  return linkedByIndex[a.index + "," + b.index] || linkedByIndex[b.index + "," + a.index];
	  };

	  // dynamically create a tooltip window on the element clicked
	  function nodeDetails(d,i) {
		var content = '<p class="main">' + d.name + '</span></p>';
		content += '<hr class="tooltip-hr">';
		content += '<p class="extra">' + d.group + '</span></p>';
		
		// dynamically size the tooltip width based on the text inside (group name and component name)
		tooltip.showTooltip(content,d3.event,d.name.length>30||d.group.length>42?Math.max(d.name.length/30, d.group.length/42):1);
		
		d3.select(this).select("circle").style("stroke","#555")
		  .style("stroke-width", 1.5)
		  .transition()
			.duration(750)
			.attr("r", 9);

		circle.filter(function(v){return isConnected(d,v);}).select("circle").style("stroke", "#555").style("stroke-width", 2);    
		path.classed({'link-highlight':function(o) { 
								return o.source === d || o.target === d ? true : false;
							},

						 'licensing':function(o) { 
								return o.source === d || o.target === d ? false : true;
							},   
						'link':true});   
	   } 

	  function hideDetails(d,i){
		tooltip.hideTooltip();
		d3.select(this).select("circle").style("stroke","#fff")
		  .style("stroke-width", 1.0)
		  .transition()
			.duration(750)
			.attr("r", 6);

		circle.filter(function(v){return isConnected(d,v);}).select("circle").style("stroke", "#fff").style("stroke-width", 1);        
		path.classed({"link-highlight":false, "link":true, "licensing":true});    
	  }

	  function linkArc(d) {
		var dx = d.target.x - d.source.x,
			dy = d.target.y - d.source.y,
			dr = 2*Math.sqrt(dx * dx + dy * dy);
			
		  // Use this to allow self loops
		  if ( d.source.x === d.target.x && d.source.y === d.target.y ) {
			// Fiddle with this angle to get loop oriented.
			var xRotation = -45,        
			largeArc = 1, // Needs to be 1.
			sweep = 1,  // Change sweep to 0/1 to change orientation of loop. 
			drx = 9,
			dry = 6;   // Make drx and dry different to get an ellipse instead of a circle.

			// For whatever reason the arc collapses to a point if the beginning
			// and ending points of the arc are the same, so kludge it.
			var x2 = d.source.x + 1,
			y2 = d.source.y + 1;
			//return "M" + d.source.x + "," + d.source.y + "A" + drx + "," + dry + " " + xRotation + "," + largeArc + "," + sweep + " " + x2 + "," + y2;
		  } 
		return "M" + d.source.x + "," + d.source.y + "A" + dr + "," + dr + " 0 0,1 " + d.target.x + "," + d.target.y;
	  }

	  function transform(d) {
		return "translate(" + d.x + "," + d.y + ")";
	  }

	   // split the data based on groups
	   // split into groups based on key function and,
	   // map each element inside a group into a geometric point based on its geometry (a tuple of its x and y coordinates)
	  function makeHullData(node_data) {
	   var data = d3.nest()
		.key(function(d) { return d.group;})
		.rollup(function(d) { 
		 return d.map(function(g) {
		  return [g.x, g.y]; 
		  });
		}).entries(node_data);
	  
	   return data;  
	  }    


	  function redrawHulls() {
		  hullData = makeHullData(circle.filter(function(d){ return d3.select(this).style("visibility")!="hidden";}).data());
		  
		  // groups of size atleast 3 would be enclosed under a hull
		  validIndices = d3.range(hullData.length).filter(function(v){return (hullData[v].values).length>2;})
		  hullSelection = hull.selectAll("path")
							.data(validIndices.map(function(i){return d3.geom.hull(hullData[i].values);}));

		  hullSelection.enter()
			  .append("path").attr("class", "hull");

		  hullSelection.attr("d", function(d) {
				  return "M" + d.join("L") + "Z";
			  });

	  }   
	  
	  function clearHulls() {
		  hull.selectAll("path").remove();
	  }
	  
	  window.dispatch.on("filterChange", function(context, filters) {
		  function filterCondition(d) {
			  for (var f in filters) {
				field = window.fieldmap.get(f);
				if (d.prop[field] in filters[f])
					return true;
			  }
			  return false;
		  }
	
		  path.attr("visibility", function(d){
			  return (filterCondition(d.source)) || (filterCondition(d.target)) ? "hidden":"visible";});	
		
		  
		  circle.attr("visibility", function(d){
			  return filterCondition(d) ? "hidden":"visible";});

		 clearHulls();
		 force.start();
	  });

 }

  function dragstarted(d) {
    d3.event.sourceEvent.stopPropagation();
    
    d3.select(this).classed("dragging", true);
    force.start();
  }

  function dragged(d) {
    
    d3.select(this).attr("cx", d.x = d3.event.x).attr("cy", d.y = d3.event.y);
    
  }

  function dragended(d) {
    
    d3.select(this).classed("dragging", false);
  }

  function zoomed() {
    svg.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
  }
  
  function clearSVG() {	
	  // remove any old svg
	  d3.select("svg").remove();
	  d3.select("#svg-container").select("label").remove();
  }
  
  
 return false;
};

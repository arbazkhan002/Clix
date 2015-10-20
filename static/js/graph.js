function drawgraph() {
  var width = 1120,
      height = 500;

  var color = d3.scale.category20();

  var force = d3.layout.force()
      .charge(-120)
      .size([width, height]);

  // remove any old svg
  d3.select("svg").remove();
  d3.select("#svg-container").select("label").remove();
  
  var svg = d3.select("#svg-container").append("svg")
      .attr("width", width)
      .attr("height", height);

  var tooltip = Tooltip("vis-tooltip", 230)    

  d3.json("http://10.151.100.204:5000/datagraph?link='COUNT'&node='COMPONENT_TYPE'", function(error, graph) {
    function linkArc(d) {
      var dx = d.target.x - d.source.x,
          dy = d.target.y - d.source.y,
          dr = Math.sqrt(dx * dx + dy * dy);
      return "M" + d.source.x + "," + d.source.y + "A" + dr + "," + dr + " 0 0,1 " + d.target.x + "," + d.target.y;
    }

    function transform(d) {
      return "translate(" + d.x + "," + d.y + ")";
    }

    if (error) {
      return console.error(error);
    }

   force
        .nodes(graph.nodes)
        .links(graph.links)
        .linkDistance(function(link, index) { return link.len;})
        .start();

  // Per-type markers, as they don't inherit styles.
  svg.append("defs").selectAll("marker")
      .data(["licensing"])
    .enter().append("marker")
      .attr("id", function(d) { return d; })
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 15)
      .attr("refY", -1.5)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
    .append("path")
      .attr("d", "M0,-5L10,0L0,5");

  var path = svg.append("g").selectAll("path")
      .data(force.links())
    .enter().append("path")
      .attr("class", function(d) { return "link licensing"; })
      .style("stroke-opacity", function(d) { return d.value==0?0:0.6; })
      .style("stroke-width", function(d) { return d.value==0?0:'1px'; })    
      .attr("marker-end", function(d) { return "url(#licensing)"; });

  var circle = svg.selectAll("g.node")
      .data(force.nodes())
    .enter().append("svg:g")
      .attr("class", "node")
      .call(force.drag);

  circle.append("circle") 
      .attr("r", 6)
      .style("stroke","#555")
      .style("stroke-width", 1.0)
      .style("fill", function(d) { return color(d.group); });

  /*    
  circle.append("svg:text")
      .attr("class", "nodetext")
      .attr("dx", 12)
      .attr("dy", ".35em")
      .text(function(d) { return d.name });
  */
  
  circle.on("mouseover", nodeDetails)
    .on("mouseout", hideDetails);

  var text = svg.append("g").selectAll("text")
      .data(force.nodes())
    .enter().append("text")
      .attr("x", 8)
      .attr("y", ".31em")
      .attr("class", "nodetext")
      .text(function(d) { return d.name; });
     
  function nodeDetails(d,i) {
    var content = '<p class="main">' + d.name + '</span></p>';
    content += '<hr class="tooltip-hr">';
    content += '<p class="extra">' + d.group + '</span></p>';
    tooltip.showTooltip(content,d3.event,d.name.length>30||d.group.length>42?Math.max(d.name.length/30, d.group.length/42):1);
    d3.select(this).select("circle").style("stroke","black")
      .style("stroke-width", 2.0);
   } 

  function hideDetails(d,i){
    tooltip.hideTooltip();
    d3.select(this).select("circle").style("stroke","#555")
      .style("stroke-width", 1.0);
  }

  function linkArc(d) {
    var dx = d.target.x - d.source.x,
        dy = d.target.y - d.source.y,
        dr = Math.sqrt(dx * dx + dy * dy);
    return "M" + d.source.x + "," + d.source.y + "A" + dr + "," + dr + " 0 0,1 " + d.target.x + "," + d.target.y;
  }

  function transform(d) {
    return "translate(" + d.x + "," + d.y + ")";
  }

    force.on("tick", function() {
      path.attr("d", linkArc);
      circle.attr("transform", transform);
    });

  });
 return false;
};
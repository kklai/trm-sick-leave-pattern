import React, {Component, useEffect} from 'react';
import * as d3 from "d3";
import data from './34236.json';

function SLChart() {

	  useEffect(() => {
	    drawChart();
	    window.addEventListener('resize', drawChart);
	  }, []);

	function drawChart() {
		var year;
		var doc;
		var doclabels = [];
		var doclabelgroup = [];
		data.forEach(function(d,i){
			d.date = new Date(d["Issue Date"]);
			var thisyear = d["Issue Date"].split("-")[0];
			if (year != thisyear) {
				year = thisyear;
				d.addyear = true;
			}

			var thisdoc = d["Doctor Label"];
			if (i != 0) {
				if (doc != thisdoc || (i == data.length - 1)) {

					if ((i == data.length - 1)) {
						doclabelgroup.push(d);
					}

					if (doclabelgroup.length > 0) {
						doclabels.push(doclabelgroup);
					}
					doclabelgroup = [];
					doc = thisdoc;
				}
				doclabelgroup.push(d);
			}
		})

		let sel = d3.select(".g-chart").html("");
		let width = sel.node().getBoundingClientRect().width;
		let height = 500;
		let margin = {top: 150, right: 80, bottom: 60, left: 25}
		let svg = sel.append("svg")
		    .attr("width", width)
		    .attr("height", height)
		    .append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")")
		    

		height -= margin.top + margin.bottom;
		width -= margin.left + margin.right;

		const dateRange = data.map(d => d["Issue Date"]);
		const yRange = data.map(d => d["SLC Total"]);

		const xBar = d3.scaleBand().domain(dateRange).range([0,width]).padding(0.1);
		const x = d3.scaleOrdinal().domain(dateRange).range([0,width]);
		const format = d3.timeFormat("%b %Y");
		const xAxis = d3.axisBottom(xBar)
			// .tickFormat(format);

		const yDay = d3.scaleLinear().domain([0,d3.max(data, d => +d["SLC Total"])]).range([height,0]);
		const yCum = d3.scaleLinear().domain([0,d3.max(data, d => +d["Cumulative SL"])]).range([height,0]);
		const yAxisDay= d3.axisLeft(yDay).tickSize(5).ticks(5);
		const yAxisCum = d3.axisRight(yCum).tickSize(5).ticks(5);


		// add doctor labels
		var doctorg = svg.append("g").attr("class", "g-doctor-label");
		doclabels.forEach(function(d){
			var xstart = xBar(d[0]["Issue Date"])
			var xend = xBar(d[d.length - 1]["Issue Date"]) + xBar.bandwidth() + 1;

			var pointerHeight = 0;
			var pointerEnd = height + margin.bottom - 10;

			var g = doctorg.append("g")
				.attr("transform", "translate(" + xstart + ",-50)")

			g.append("path")
				.attr("d", "M0," + pointerEnd + " L0," + pointerHeight + " L" + (xend - xstart) + "," + pointerHeight + " L" + (xend - xstart) + "," + + pointerEnd)

			g.append("text")
				.style("font-size", "10px")
				.attr("transform", "translate(" + (xend - xstart)/2 + ",-5) rotate(-60) ")
				.text(d[0]["Doctor Label"])

		})


     	var xaxis = svg.append("g")
     		.attr("class", "x axis")
     		.attr("transform", "translate(0," + height + ")")
     		.call(xAxis);

     	xaxis.selectAll(".tick")
     		.attr("class", function(d,i){
     			var cls = "tick date-" + d;
     			cls = data[i].addyear ? cls += " g-show-always" : cls;
     			return cls;
     		})

     	xaxis.selectAll("text")
     		.attr("text-anchor", "end")
     		.attr("transform", "rotate(-60) translate(-10,-5)")
     		.text(function(d,i) {
     			if (data[i].addyear) {
     				return d;
     			} else {
     				return d.split("-")[1] + "-" + d.split("-")[2];
     			}
     			
     		})

     	svg.append("g")
     		.attr("class", "y axis left")
     		.attr("transform", "translate(0,0)")
     		.call(yAxisDay);

     	var yaxisRight = svg.append("g")
     		.attr("class", "y axis right")
     		.attr("transform", "translate(" + width + ",0)")
     		.call(yAxisCum);

     	svg.append("g")
 	    .selectAll("rect")
 	    .data(data)
 	    .join("rect")
 	      .attr("class", "g-slc-fill")
 	      .attr("id", (d,i) => "rect-" + i)
 	      .attr("data-date", (d,i) => d["Issue Date"])
 	      .attr("x", d => xBar(d["Issue Date"]))
 	      .attr("y", d => yDay(d["SLC Total"]))
 	      .attr("height", d => yDay(0) - yDay(d["SLC Total"]))
 	      .attr("width", xBar.bandwidth())
 	      .on("mouseover", onMouseOver)
 	      .on("mouseout", onMouseOut)


 	    let line = d3.line()
 	    	.curve(d3.curveLinear)
 	    	.x(d => xBar(d["Issue Date"]) + xBar.bandwidth()/2)
 	    	.y(d => yCum(d["Cumulative SL"]))

 	    svg.append("g")
 	    	.append("path")
 	    	.attr("class", "g-line g-cum-stroke")
 	    	.datum(data)
 	    	.attr("d", line)

 	    // add SLC total / Cumulative SL label
 	    var max = {
 	    	"SLC Total": data.filter(d => d["SLC Total"] == d3.max(data, d => +d["SLC Total"]))[0],
 	    	"Cumulative SL": data.filter(d => d["Cumulative SL"] == d3.max(data, d => +d["Cumulative SL"]))[0]
 	    }
 	    
 	    var addlabels = [
 	    	{type: "SLC Total"},
 	    	{type: "Cumulative SL"}
 	    ];

 	    var labelcont = sel.append("div")
 	    	.attr("class", "g-label-cont")
 	    	.style("top", margin.top + "px")
 	    	.style("left", margin.left + "px")
 	    	.style("width", width + "px")
 	    	.style("height", height + "px")

 	    addlabels.forEach(function(thing){
 	    	data.forEach(function(d,i){
 	    		// var d = thing.d;
 	    		var last = i == data.length - 1;
 	    		var isMax = d == max[thing.type];
 	    		var ypos = thing.type == "Cumulative SL" ? yCum(d["Cumulative SL"]) : yDay(d["SLC Total"]);
 	    		var cls = "g-abs-label g-labels g-label-" + i + " g-" + thing.type.toLowerCase().split(" ").join("-");
 	    		cls = isMax ? cls + " g-active-always" : cls;
 	    		cls = last ? cls + " g-label-last" : cls;
 	    		var labeldiv = labelcont.append("div")
 	    			.attr("class", cls)
 	    			.style("top", ypos + "px")
 	    			.style("left", xBar(d["Issue Date"]) + "px")

 	    		var textx = last && thing.type == "Cumulative SL" ? 0 : thing.type == "Cumulative SL" ? -30 : -19;
 	    		var texty = -35;

 	    		var str = "<div class='g-inner'><div class='g-text-bg'>" + thing.type + "</div></div>";
 	    		str += "<div class='g-inner'><div class='g-text-bg'>" + d[thing.type] + " days</div></div>";

 	    		labeldiv.append("div")
 	    			.style("margin-top", texty + "px")
 	    			.style("margin-left", textx + "px")
 	    			.html(str)

 	    		if (thing.type == "Cumulative SL") {
 	    			labeldiv.append("div")
 	    				.attr("class", "g-dot")
 	    				.style("left", ((xBar.bandwidth()/2)-2.5) + "px")

 	    		} else {
 	    			labeldiv.append("div")
 	    				.attr("class", "g-pointer")
 	    				.style("left", (xBar.bandwidth()/2) + "px");
 	    		}
 	    	})
 	    })

 	    function onMouseOver(d){
 	        var el = d3.select(this)
 	        var id = el.attr("id").split("-")[1];
 	        el.style("fill", "#004646")
 	        var labelel = d3.selectAll(".g-label-" + id)
 	        labelel.classed("g-active", true);
 	        labelel.raise();

 	        var date = el.attr("data-date");
 	        d3.select(".x.axis .date-" + date).classed("g-highlight", true);
 	    }

 	    function onMouseOut(d){
 	    	d3.selectAll(".g-labels").classed("g-active", false);
 	        d3.select(this).style("fill", "teal") 	    
 	        d3.selectAll(".x.axis .tick").classed("g-highlight", false);
 	   	}

    }


	  return (
	  	<div>
	  	<div className="picker">
	  	  <label>TRM Reference</label>
	  	  <select name="ref" id="ref">
	  	    <option value="34236">34236</option>
	  	  </select>
	  	</div>
	    <div className="g-chart"></div>
	    
	    </div>
	  )

}

export default SLChart;
import React, {Component, useEffect} from 'react';
import * as d3 from "d3";
import data from './data/34585.json';
import action_log from './data/action_log.json';
import code from './data/code.json';

function SLChart() {

	  useEffect(() => {
	    drawChart();
	    window.addEventListener('resize', drawChart);
	  }, []);

	function drawChart() {
		console.clear();
		var ref = "34585";
		var action_log_filtered = action_log.filter(d => d["TRM Ref"] == ref);
		data = data.filter(d => d["Issue Date"]);

		var doc;
		var doclabels = [];
		var doclabelgroup = [];
		data.forEach(function(d,i){
			d.date = d["Issue Date"];
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

		var alldates = data.map(d => d.date);
		action_log_filtered.forEach(function(d){
			alldates.push(d["Action Date"])
		})
		alldates = alldates.sort((a,b) => +new Date(a) - +new Date(b));

		const yearmarks = [];
		var yearrow = [], curyear;
		var addyears = [];
		alldates.forEach(function(d,i){
			var year = d.split("-")[0];
			if (yearrow.length == 0) {
				yearrow = [d]
				curyear = year;
			}

			if (curyear != year || i == alldates.length - 1) {
				yearrow.push(d);
				yearmarks.push(yearrow);
				yearrow = [];
				curyear = year;
			}

			if (curyear != year) {
				curyear = year;
				addyears.push(true);
			} else {
				addyears.push(false);
			}
		})

		const dateRange = data.map(d => d["Issue Date"]);
		const yRange = data.map(d => d["SLC Total"]);
		const fullDateRange = alldates;
		const divider = width < 600 ? 6 : 10
		const datenthshow = Math.round(fullDateRange.length/divider);

		const xBar = d3.scaleBand().domain(fullDateRange).range([0,width]).padding(0.1);
		const formatWYear = d3.timeFormat("%b %Y");
		const format = d3.timeFormat("%b");
		const tickDates = fullDateRange.filter(function(d,i) {
			var day = d.split("-")[2];
			var month = d.split("-")[1];
			return i == 0 || i == fullDateRange.length - 1 || day == 1;
		})
		const tickValues = alldates.filter((d,i) => i == 0 || i == tickDates.length - 1 || i%datenthshow == 0)
		const xAxis = d3.axisBottom(xBar)
			.tickValues(tickValues)
			.tickFormat(function(d,i){
				var ddate = new Date(d)
				const format1 = d3.timeFormat("%b %d, %Y");
				const format2 = d3.timeFormat("%b %d");
				if (i == 0 || i == tickDates.length - 1 || addyears[i]) {
					return format1(ddate)
				} else {
					return format2(ddate)
				}
			});

		const yDay = d3.scaleLinear().domain([0,d3.max(data, d => +d["SLC Total"])]).range([height,0]);
		const yCum = d3.scaleLinear().domain([0,d3.max(data, d => +d["Cumulative SL"])]).range([height,0]);
		const yAxisDay= d3.axisLeft(yDay).tickSize(5).ticks(5);
		const yAxisCum = d3.axisRight(yCum).tickSize(5).ticks(5);


		// add doctor labels
		var doctorg = svg.append("g").attr("class", "g-doctor-label");
		doclabels.forEach(function(d){
			var xstart = xBar(d[0].date)
			var xend = xBar(d[d.length - 1].date) + xBar.bandwidth() + 1;

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

     	xaxis.selectAll("text")
     		.attr("text-anchor", "end")
     		.attr("transform", "rotate(-60) translate(-10,-5)")

     	xaxis.selectAll(".tick")
     		.attr("class", function(d,i){
     			var el = d3.select(this);
     			var text = el.text();
     			if (i == 0 || i == tickDates.length - 1) {
     				return "g-always-show tick"
     			} else {
     				return "tick"
     			}
     		})

     	var yeartick = svg.append("g").attr("class", "g-year-ticks");

     	yearmarks.forEach(function(d){
     		var pos_a = xBar(d[0]) + (xBar.bandwidth()/2) 
     		var pos_b = xBar(d[1]) + (xBar.bandwidth()/2) 
     		var pos = (pos_a + pos_b)/2;

     		if ((pos_b - pos_a) > 20) {
     			yeartick.append("text")
     				.attr("x", pos)
     				.attr("y", height + 85)
     				.attr("text-anchor", "middle")
     				.text(d[0].split("-")[0])
     		}

     		yeartick.append("path")
     			.attr("transform", "translate(" + pos_b + "," + (height+77) + ")")
     			.attr("d", "M0,0 L0,10")
     			.style("stroke", "#999")
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
 	      .attr("data-date", (d,i) => d.date)
 	      .attr("x", d => xBar(d.date))
 	      .attr("y", d => yDay(d["SLC Total"]))
 	      .attr("height", d => yDay(0) - yDay(d["SLC Total"]))
 	      .attr("width", xBar.bandwidth())
 	      .on("mouseover", onMouseOver)
 	      .on("mouseout", onMouseOut)


 	    let line = d3.line()
 	    	.curve(d3.curveLinear)
 	    	.x(d => xBar(d.date) + xBar.bandwidth()/2)
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
 	    		var isMax = d["Issue Date"] == max[thing.type]["Issue Date"];
 	    		var ypos = thing.type == "Cumulative SL" ? yCum(d["Cumulative SL"]) : yDay(d["SLC Total"]);
 	    		var cls = "g-abs-label g-labels g-label-" + i + " g-" + thing.type.toLowerCase().split(" ").join("-");
 	    		cls = isMax ? cls + " g-active-always g-label-max" : cls;
 	    		cls = last ? cls + " g-label-last" : cls;
 	    		var labeldiv = labelcont.append("div")
 	    			.attr("class", cls)
 	    			.style("top", ypos + "px")
 	    			.style("left", xBar(d.date) + "px")

 	    		var textx = 0
 	    		// isMax && thing.type == "SLC Total" ? -30 : last && thing.type == "Cumulative SL" ? 0 : thing.type == "Cumulative SL" ? -20 : -8;
 	    		var texty = -35;

 	    		var str = "<div class='g-inner'><div class='g-text-bg'>" + thing.type + "</div></div>";
 	    		str += "<div class='g-inner'><div class='g-text-bg'>" + d[thing.type] + " days</div></div>";

 	    		labeldiv.append("div")
 	    			.attr("class", "g-label-a")
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

 	   	var actionlogg = sel.append("div").attr("class", "g-action-log-cont")
 	   	action_log_filtered.forEach(function(d){
 	   		var logg = actionlogg.append("div")
 	   			.attr("class", "g-action-log")
 	   			.style("top", (height + margin.top - 30) + "px")
 	   			.style("left", (xBar(d["Action Date"]) + margin.left) + "px")

 	   		var fullcode = code.filter(a => a["Strategy-code"] == d.Code)[0];
 	   		fullcode = fullcode ? fullcode.Strategy : "";
 	   		logg
 	   			.append("div")
 	   			.attr("class", "g-action-log-inner")
 	   			.text(d.Code)
 	   			.attr("data-code", d.Code)
 	   			.attr("data-fullcode", fullcode)
 	   			.attr("data-date", d["Action Date"])
 	   			.on("mouseover", onMouseOverActionLog)
 	   			.on("mouseout", onMouseOutActionLog)
 	   	})

 	   	function onMouseOverActionLog(d){
 	   		var el = d3.select(this)
 	   		el.classed("g-action-highlighted", true)
 	   		el.html(el.attr("data-fullcode") + "<br>" + el.attr("data-date"))
 	   	}

 	   	function onMouseOutActionLog(d){
 	   		var el = d3.select(this)
 	   		el.classed("g-action-highlighted", false)
 	   		el.html(el.attr("data-code"))
 	   	}

    }


	  return (
	  	<div>
	  	<div className="picker">
	  	  <label>TRM Reference</label>
	  	  <select name="ref" id="ref">
	  	    <option value="34585">34585</option>
	  	  </select>
	  	</div>
	    <div className="g-chart"></div>
	    
	    </div>
	  )

}

export default SLChart;
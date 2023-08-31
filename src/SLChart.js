import React, {Component, useEffect} from 'react';
import * as d3 from "d3";
import data from './data/36264.json';
import action_log from './data/action_log.json';
import code from './data/code.json';
import benchmark from './data/benchmark.json';

function SLChart() {

	  useEffect(() => {
	    drawChart();
	    window.addEventListener('resize', drawChart);
	  }, []);

	Date.prototype.addDays = function(days) {
		var date = new Date(this.valueOf());
		date.setDate(date.getDate() + days);
		return date;
	}

	function getDates(startDate, stopDate) {
		var dateArray = new Array();
		var currentDate = startDate;
		while (currentDate <= stopDate) {
		 dateArray.push(new Date (currentDate));
		 currentDate = currentDate.addDays(1);
		}
		return dateArray;
	}

	var formatDate = d3.timeFormat("%Y-%m-%d");

	function drawChart() {
		console.clear();
		var ref = "36264";
		var action_log_filtered = action_log.filter(d => d["TRM Ref"] == ref);
		data = data.filter(d => d["Issue Date"] && d["Issue Date"].indexOf("-") > -1);

		var startdate = data[0]["Issue Date"];
		var enddate = data[data.length - 1]["Issue Date"];
		var startdatef = (new Date(startdate)).addDays(1)
		var enddatef = (new Date(enddate)).addDays(2)

		// add sl / benchmark / lr line
		var benchmark_types = ["HR", "BM", "LR"]
		var benchmark_match = 100; // need to find the benchmark date
		var benchmark_dates = [];
		let benchmarklinedata = [];
		benchmarklinedata.push({
			date: startdate,
			"Cumulative SL": 0
		})
		benchmark_types.forEach(function(type){
			var date = new Date(startdatef);
			if (type == "HR") {
				date.setDate(date.getDate() + 30);
			} else if (type == "BM" && benchmark_match) {
				date.setDate(date.getDate() + +benchmark_match);
				benchmarklinedata.push({
					date: formatDate(date),
					"Cumulative SL": benchmark_match
				})
			} else if (type == "LR" && benchmark_match) {
				date = date.addDays(+benchmark_match+100);
			}
			benchmark_dates.push(formatDate(date))

			if (date > enddatef) {
				enddatef = date;
			}
		})

		// action log data process
		action_log_filtered.forEach(function(d){
			var date = (new Date(d["Action Date"])).addDays(1);
			if (date > enddatef) {
				enddatef = date;
			}

			var match = data.filter(a => a.date == d.date)[0];
			d.usey = match ? match["Cumulative SL"] : 0;
		})

		// add an end date to the data
		data.forEach(function(d){
			var date = (new Date(d["Issue Date"])).addDays(1);
			d.datef = date;
			if (d["SLC Total"]) {
				d.enddatef = date.addDays(+d["SLC Total"]);
				if (d.enddatef > enddatef) {
					enddatef = d.enddatef;
				}
				d.enddate = formatDate(d.enddatef);
			}
		})

		var datearrayf = getDates(startdatef, enddatef)
		var datearray = [];
		datearrayf.forEach(function(d){
			var year = d.getFullYear();
			var month = +d.getMonth()+1;
			var day = d.getDate;
			datearray.push(formatDate(d));
		});

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

		const yearmarks = [];
		var yearrow = [], curyear;
		var addyears = [];
		datearray.forEach(function(d,i){
			var year = d.split("-")[0];
			if (yearrow.length == 0) {
				yearrow = [d]
				curyear = year;
			}
			if (curyear != year || i == datearray.length - 1) {
				yearrow.push(d);
				yearmarks.push(yearrow);
				yearrow = [];
				curyear = year;
			}
		})

		const xBar = d3.scaleBand().domain(datearray).range([0,width]).padding(0.1);
		const formatWYear = d3.timeFormat("%b %Y");
		const format = d3.timeFormat("%b");
		let tickDates = datearray.filter(function(d,i) {
			var day = d.split("-")[2];
			var month = d.split("-")[1];
			return i == 0 || i == datearray.length - 1 || day == 1;
		})

		if (tickDates.length > 20) {
			tickDates = tickDates.filter(d => d.split("-")[1] == 1 || d.split("-")[1] == 7)
		}

		var addyears = [], curyear;
		tickDates.forEach(function(d){
			var year = d.split("-")[0];
			if (curyear != year) {
				curyear = year;
				addyears.push(true);
			} else {
				addyears.push(false);
			}
		})

		const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'June', 'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
		const xAxis = d3.axisBottom(xBar)
			.tickValues(tickDates)
			.tickFormat(function(d,i){					
				var year = d.split("-")[0];
				var month = months[d.split("-")[1]-1];
				var day = d.split("-")[2];
				if (i == 0 || addyears[i]) {
					return month + " " + day + ", " + year
				} else {
					return month + " " + day
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

     	svg.append("g")
     		.attr("class", "y axis left")
     		.attr("transform", "translate(0,0)")
     		.call(yAxisDay);

     	var yaxisRight = svg.append("g")
     		.attr("class", "y axis right")
     		.attr("transform", "translate(" + width + ",0)")
     		.call(yAxisCum);


     	var datacopy = [...data];
     	svg.append("g")
 	    .selectAll("rect")
 	    .data(datacopy.sort((a,b) => b["SLC Total"] - a["SLC Total"]))
 	    .join("rect")
 	      .attr("class", function(d){
 	      	if (d["Doctor Label"]) {
 	      		return "g-slc-fill g-slc-fill-" + d["Doctor Label"].split("-")[0].toLowerCase()
 	      	} else {
 	      		return "g-slc-fill"
 	      	}
 	      })
 	      .attr("id", (d,i) => "rect_" + d.date)
 	      .attr("data-date", (d,i) => d.date)
 	      .attr("x", d => xBar(d.date))
 	      .attr("y", d => yDay(d["SLC Total"]))
 	      .attr("height", d => yDay(0) - yDay(d["SLC Total"]))
 	      .attr("width", xBar.bandwidth())
 	      // .attr("width", d => (xBar(d.enddate) - xBar(d.date) - xBar.bandwidth()))
 	      // .style("stroke", "#fff")
 	      .on("mouseover", onMouseOver)
 	      .on("mouseout", onMouseOut)



 	    

 	    let line = d3.line()
 	    	.curve(d3.curveBasis)
 	    	.x(d => xBar(d.date))
 	    	.y(d => yCum(d["Cumulative SL"]))

 	    svg.append("g")
 	    	.append("path")
 	    	.attr("class", "g-line g-benchmark-stroke")
 	    	.datum(benchmarklinedata)
 	    	.attr("d", line)

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
 	    	{type: "Cumulative SL"},
 	    	{type: "SLC Total"},
 	    ];

 	    var labelcont = sel.append("div")
 	    	.attr("class", "g-label-cont")
 	    	.style("top", margin.top + "px")
 	    	.style("left", margin.left + "px")
 	    	.style("width", width + "px")
 	    	.style("height", height + "px")

    	data.forEach(function(d,i){
    		var last = i == data.length - 1;
    		var cls = "g-abs-label g-labels g-label-" + d.date;
    		var ypos = yDay(d["SLC Total"])
    		var labeldiv = labelcont.append("div")
    			.attr("class", cls)
    			.style("top", -50 + "px")
    			.style("left", xBar(d.date) + "px")

    		var str = ""
    		str += "<div class='g-bold'>" + d.date + "</div>";
    		addlabels.forEach(function(thing){
    			str += "<div class='g-" + thing.type.toLowerCase().split(" ").join("-") + "'>" + thing.type + ": " + d[thing.type] + "</div>";
    		})

    		labeldiv.append("div")
    			.attr("class", "g-label-a")
    			.html(str)

    		labeldiv.append("div")
    			.attr("class", "g-dot")
    			.style("top", (yCum(d["Cumulative SL"]) + 46) + "px")
    			.style("left", (xBar.bandwidth()/2 - 3) + "px");

			labeldiv.append("div")
				.attr("class", "g-pointer")
				.style("height", (ypos+8) + "px")
				.style("top", (42) + "px")
				.style("left", (xBar.bandwidth()/2) + "px");
    	})


 	    function onMouseOver(d){
 	        var el = d3.select(this)
 	        var id = el.attr("id").split("_")[1];
 	        el.classed("g-highlight", true)
 	        var labelel = d3.selectAll(".g-label-" + id)
 	        labelel.classed("g-active", true);
 	        labelel.raise();
 	        var date = el.attr("data-date");
 	        d3.select(".x.axis .date-" + date).classed("g-highlight", true);
 	    }

 	    function onMouseOut(d){
 	    	var el = d3.select(this)
 	    	d3.selectAll(".g-labels").classed("g-active", false);
 	        el.classed("g-highlight", false)
 	        d3.selectAll(".x.axis .tick").classed("g-highlight", false);
 	   	}	

 	   	var benchmark_cont = sel.append("div")
 	   		.attr("class", "g-benchmark-cont")
 	   		.style("top", 20 + "px")
 	   		.style("left", margin.left + "px")
 	   		.style("height", (height + margin.bottom + 70) + "px");

 	   	benchmark_types.forEach(function(type,i){
 	   		if (benchmark_dates[i]) {
 	   			benchmark_cont.append("div")
 	   				.attr("class", "g-benchmark-line")
 	   				.style("left", (xBar(benchmark_dates[i]) - 2) + "px")
 	   				.append("div")
 	   				.attr("class", "g-benchmark-text")
 	   				.text(type)
 	   		}
 	   	})

 	   	var actionlogg = sel.append("div").attr("class", "g-action-log-cont")
 	   	console.log(action_log_filtered)
 	   	action_log_filtered.forEach(function(d,i){
 	   		var logg = actionlogg.append("div")
 	   			.attr("class", "g-action-log g-action-log-" + i)
 	   			.style("top", (yCum(d.usey) + margin.top - 25) + "px")
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

 	   	var pos = [];
 	   	sel.selectAll(".g-action-log").each(function(e,i){
 	   		var el = d3.select(this);
 	   		pos.push({
 	   			index: i,
 	   			pos: el.node().getBoundingClientRect(),
 	   			ogtop: el.style("top").replace("px", "")
 	   		})
 	   	})

 	   	function checkPos() {
 	   		pos.forEach(function(rect1,i){
 	   			var rect1el = sel.select(".g-action-log-" + rect1.index);
 	   			var tocheck = pos.filter(d => d.index != rect1.index);
 	   			tocheck.forEach(function(rect2){
 	   				var hasOverlap = checkOverlap(rect1.pos, rect2.pos);
 	   				if (hasOverlap) {
 	   					var rect1top = +rect1el.style("top").replace("px", "");
 	   					var rect1newtop = (rect1top - 20);
 	   					var pointerheight = rect1.ogtop - rect1newtop;
 	   					rect1el.style("top", rect1newtop + "px");
 	   					pos[i].pos = rect1el.node().getBoundingClientRect();
 	   					rect1el.selectAll(".g-action-log-line").remove();
 	   					rect1el.append("div").attr("class", "g-action-log-line").style("height", pointerheight + "px")

 	   					checkPos();
 	   				}
 	   			})
 	   		})
 	   	}


 	   	function checkOverlap(rect1, rect2) {
		   	return !(rect1.right < rect2.left || 
	               rect1.left > rect2.right || 
	               rect1.bottom < rect2.top || 
	               rect1.top > rect2.bottom);
 	   	}

 	   	checkPos();




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
	  	    <option value="36264">36264</option>
	  	  </select>
	  	</div>
	    <div className="g-chart"></div>
	    
	    </div>
	  )

}

export default SLChart;
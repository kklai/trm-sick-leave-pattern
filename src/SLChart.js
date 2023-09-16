import React, {Component, useEffect} from 'react';
import * as d3 from "d3";
import data from './data/35695.json';
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
	var formatDateDisplay = d3.timeFormat("%b %d, %Y");

	function drawChart() {
		console.clear();
		var ref = "35695";
		var action_log_filtered = action_log.filter(d => d["TRM Ref"] == ref);
		data = data.filter(d => d["Issue Date"] && d["Issue Date"].indexOf("-") > -1 && d['Cumulative SL']);

		var startdate = data[0]["Issue Date"];
		var enddate = data[data.length - 1]["Issue Date"];
		var startdatef = (new Date(startdate)).addDays(1)
		var enddatef = (new Date(enddate)).addDays(2)

		// add sl / benchmark / lr line
		var benchmark_types = ["HR", "BM", "LR"]
		var benchmark_match = 100; // need to find the benchmark date
		var benchmark_dates = [];
		benchmark_types.forEach(function(type){
			var date = new Date(startdatef);
			if (type == "HR") {
				date.setDate(date.getDate() + 30);
			} else if (type == "BM" && benchmark_match) {
				date.setDate(date.getDate() + +benchmark_match);
			} else if (type == "LR" && benchmark_match) {
				date = date.addDays(+benchmark_match+100);
			}
			benchmark_dates.push(formatDate(date))

			if (date > enddatef) {
				enddatef = date;
			}
		})

		// add an end date to the data
		data.forEach(function(d){
			var date = (new Date(d["Issue Date"])).addDays(1);
			d.date = d["Issue Date"];
			d.datef = date;
			if (d["SLC Total"]) {
				d.enddatef = date.addDays(+d["SLC Total"]);
				if (d.enddatef > enddatef) {
					enddatef = d.enddatef;
				}
				d.enddate = formatDate(d.enddatef);
			}
		})

		// action log data process
		action_log_filtered.forEach(function(d){
			d.datef = (new Date(d["Action Date"])).addDays(1);
			if (d.datef > enddatef) {
				enddatef = d.datef;
			}

			if (d.datef < startdatef) {
				startdatef = d.datef;
			}
		})
		action_log_filtered.sort((a,b) => a.datef - b.datef);

		// create full set of dates and cumulative sl
		var datearrayf = getDates(startdatef, enddatef.addDays(1))
		var datearray = [];
		var prevSL = 0;
		var datearraySL = [];
		datearrayf.forEach(function(d){
			let date = formatDate(d);
			datearray.push(date);

			let datamatch = data.filter(a => a.date == date)[0];
			if (datamatch) {
				datearraySL.push(datamatch["Cumulative SL"])
				prevSL = datamatch["Cumulative SL"];
			} else {
				datearraySL.push(prevSL);
			}
		});

		// get a cumulative sl for each action log date
		action_log_filtered.forEach(function(d){
			var dateIdx = datearray.indexOf(d["Action Date"]);
			d.usey = datearraySL[dateIdx];
		})

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

		const formatMonthYear = d3.timeFormat("%b %Y");
		const formatMonth = d3.timeFormat("%b");
		let width = d3.select(".g-linechart").node().getBoundingClientRect().width;
		let margin = {top: 50, right: 100, bottom: 60, left: 25}
		const xBar = d3.scaleBand().domain(datearray).range([0,width-margin.left-margin.right]).padding(0.1);
		const xAxis = d3.axisBottom(xBar)
			.tickValues(tickDates)
			.tickFormat(function(d,i){
				let date = new Date(d).addDays(1);
				if (i == 0 || addyears[i]) {
					return formatMonthYear(date)
				} else {
					return formatMonth(date)
				}
			});

		drawLineChart();
		function drawLineChart() {
			let sel = d3.select(".g-linechart").html("");
			let height = 400;
			let svg = sel.append("svg")
			    .attr("width", width)
			    .attr("height", height)
			    .append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")")
			    
			height -= margin.top + margin.bottom;
			width -= margin.left + margin.right;
			
			const yCum = d3.scaleLinear().domain([0,d3.max(data, d => +d["Cumulative SL"])]).range([height,0]);
			const yAxisCum = d3.axisLeft(yCum).tickSize(5).ticks(5);

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
				.attr("class", "y axis right")
				.attr("transform", "translate(0,0)")
				.call(yAxisCum);

	 	    let line = d3.line()
	 	    	.curve(d3.curveBasis)
	 	    	.x(d => xBar(d.date))
	 	    	.y(d => yCum(d["Cumulative SL"]))

	 	    svg.append("g")
	 	    	.append("path")
	 	    	.attr("class", "g-line g-cum-stroke")
	 	    	.datum(data)
	 	    	.attr("d", line)

	 	    let lastpt = data[data.length - 1];
	 	    if (lastpt.datef != enddatef) {
	 	    	svg.append("g")
		 	    	.append("path")
		 	    	.attr("class", "g-line g-cum-stroke")
		 	    	.style("stroke", "#999")
		 	    	.style("stroke-dasharray", "2 4")
		 	    	.datum([lastpt, {date: formatDate(enddatef), "Cumulative SL": lastpt["Cumulative SL"]}])
		 	    	.attr("d", line)
	 	    }

	 	    let lastptg = svg.append("g")
	 	    	.attr("transform", "translate(" + (xBar(formatDate(enddatef))+8) + "," + (yCum(lastpt["Cumulative SL"])+5) + ")");
			lastptg.append("text")
				.text(formatDate(enddatef))
			lastptg.append("text")
				.style("font-weight", 700)
				.attr("y", 14)
				.text(lastpt["Cumulative SL"] + " days")
	 	    	
	 	   	var benchmark_cont = sel.append("div")
	 	   		.attr("class", "g-benchmark-cont")
	 	   		.style("top", 20 + "px")
	 	   		.style("left", margin.left + "px")
	 	   		.style("height", (height + margin.bottom - 30) + "px");

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

	 	   	action_log_filtered.sort((a,b) => b.datef - a.datef);
	 	   	var actionlogg = sel.append("div").attr("class", "g-action-log-cont")
	 	   	action_log_filtered.forEach(function(d,i){
	 	   		let ypos = yCum(d.usey)
	 	   		var logg = actionlogg.append("div")
	 	   			.attr("class", "g-action-log g-action-log-" + i)
	 	   			.style("top", (ypos + margin.top - 28) + "px")
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

	 	   	function getPos() {
	 	   		let pos = [];
	 	   		sel.selectAll(".g-action-log").each(function(e,i){
	 	   			var el = d3.select(this);
	 	   			var bb = el.node().getBoundingClientRect();
	 	   			pos.push({
	 	   				index: i,
	 	   				pos: bb,
	 	   				ogtop: el.style("top").replace("px", ""),
	 	   				code: el.select(".g-action-log-inner").attr("data-code")
	 	   			})
	 	   		})
	 	   		return pos;
	 	   	}

	 	   	function checkOverlap(rect1, rect2) {
			   	return !(rect1.right < rect2.left || 
		               rect1.left > rect2.right || 
		               rect1.bottom < rect2.top || 
		               rect1.top > rect2.bottom);
	 	   	}

	 	   	var pos = getPos();
	 	   	var keepchecking = true;
	 	   	var nomoreoverlap = false;
	 	   	var newtop = 1000;
	 	   	while (keepchecking) {
	 	   		nomoreoverlap = true;
	 	   		pos.forEach(function(d,checkindex){
	 	   			let rect1 = pos[checkindex];
	 	   			var rect1el = sel.select(".g-action-log-" + rect1.index);
	 	   			var tocheck = pos.filter(d => d.index != rect1.index);
	 	   			tocheck.forEach(function(rect2){
	 	   				var hasOverlap = checkOverlap(rect1.pos, rect2.pos);
	 	   				if (hasOverlap) {
	 	   					var rect2el = sel.select(".g-action-log-" + rect2.index);
	 	   					var rect1top = +rect1el.style("top").replace("px", "");
	 	   					var rect2top = +rect2el.style("top").replace("px", "");
	 	   					var rect1height = +rect1el.style("height").replace("px", "");
	 	   					var rect1newtop = (rect2top - rect1height - 0.5);
	 	   					if (rect1newtop < newtop) {
	 	   						newtop = rect1newtop;
	 	   					}
	 	   					var pointerheight = rect1.ogtop - rect1newtop;
	 	   					rect1el.style("top", rect1newtop + "px");
	 	   					pos[checkindex].pos = rect1el.node().getBoundingClientRect();
	 	   					rect1el.selectAll(".g-action-log-line").remove();
	 	   					rect1el.append("div").attr("class", "g-action-log-line").style("height", pointerheight + "px")
	 	   					nomoreoverlap = false;
	 	   					return;
	 	   				}
	 	   			})
	 	   		})
	 	   		if (nomoreoverlap) {
	 	   			keepchecking = false;
	 	   		}
	 	   	}

	 	   	sel.style("margin-top", Math.abs(newtop) + "px")

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

		

		drawBarChart();

		function drawBarChart() {

			let sel = d3.select(".g-barchart").html("");
			let width = sel.node().getBoundingClientRect().width;
			margin.top = 20;
			let height = 150;
			let svg = sel.append("svg")
			    .attr("width", width)
			    .attr("height", height)
			    .append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")")
			    
			height -= margin.top + margin.bottom;
			width -= margin.left + margin.right;
			
			const yDay = d3.scaleLinear().domain([0,d3.max(data, d => +d["SLC Total"])]).range([height,0]);
			const yAxisDay= d3.axisLeft(yDay).tickSize(5).ticks(5);


			d3.selectAll("#tooltip").remove();
			var tooltip = d3.select("body")
			  .append("div")
			  	.attr("id", "tooltip")
			    .style("position", "absolute")
			    .style("visibility", "hidden")
			    .text("I'm a circle!");

			svg.append("g")
			.selectAll("rect")
			.data(data)
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
			.attr("width", d => (xBar(d.enddate) - xBar(d.date)))
			// .attr("width", d => (xBar(d.enddate) - xBar(d.date) - xBar.bandwidth()))
			.style("stroke", "#fff")
			.on("mouseover", function(){
				d3.select(this).classed("g-rect-highlight", true);
	    	  	return tooltip.style("visibility", "visible");
	    	  })
	    	  .on("mousemove", function(event,d){
	    	  	tooltip.html(d.date + '<br>' + d["SLC Total"] + ' days')
	    	  	return tooltip.style("top", (event.pageY - 30)+"px").style("left",(event.pageX + 10)+"px");
	    	  })
	    	  .on("mouseout", function(){
	    	  	d3.select(this).classed("g-rect-highlight", false);
	    	  	return tooltip.style("visibility", "hidden");
	    	  });


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

		}
 	   	

    }


	  return (
	  	<div>
	  	<div className="picker">
	  	  <label>TRM Reference</label>
	  	  <select name="ref" id="ref">
	  	    <option value="35695">35695</option>
	  	  </select>
	  	</div>
	  	<h3>Accumulated Sick Leave Days</h3>
	    <div className="g-chart g-linechart"></div>
	    <h3>When Sick Leave Was Granted</h3>
	    <div className="g-chart g-barchart"></div>
	    
	    </div>
	  )

}

export default SLChart;
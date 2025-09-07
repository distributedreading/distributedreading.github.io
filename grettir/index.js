function visualize() {

	var body = d3.select("body")

	var vis = body.append("div")
		.attr("id", "visualization")

	var div_legend = vis.append("div")
		.attr("id", "legend")

	var svg = vis.append("svg")
		.attr({
			viewBox: "0 0 1000 1000",
			preserveAspectRatio: "xMaxYMin meet"
		})

	svg.append("rect")
		.attr({
			width: 1000,
			height: 1000,
			fill: "white"
		})

	var plot = svg.append("g")
		.attr({
			id: "plot",
			transform: "translate(0, 1000) scale(1, -1)"
		})
	
	var space = plot.append("g")
		.attr({
			id: "space",
			transform: "translate(200, 200)"
		})

	space.append("g").attr("class", "x axis")
	space.append("g").attr("class", "y axis")

	var div_menu = vis.append("div")
		.attr("id", "menu")

	buildMenu(div_menu)

	var div_errors = body.append("div")
		.attr("id", "details")
			.append("div")
			.attr("id", "errors")

	buildErrors(div_errors)

	initialize()
}

function initialize() {

	// Set default dimensions if none are stored
	if (!localStorage.vertical || !localStorage.horizontal) {
		// Get dimension IDs for defaults
		var dimensions = d3.select("select.dimension.menu").selectAll("option").data();
		// Set defaults: offence weight for vertical, offence impact for horizontal
		// These were prominently featured in the paper's Figure 11.8
		
		// Find dimensions by name instead of using fixed indices
		var offenceWeight = dimensions.find(function(d) { return d.name === "offence weight"; });
		var offenceImpact = dimensions.find(function(d) { return d.name === "offence impact"; });
		
		if (offenceWeight && offenceImpact) {
			localStorage.vertical = offenceWeight.id;    // offence weight
			localStorage.horizontal = offenceImpact.id;  // offence impact
		}
	}

	var selectedIndices = [localStorage.vertical, localStorage.horizontal]
		.map(function(id, i){
			var index = i
			d3.select("select.dimension.menu")
				.selectAll("option").data()
				.find(function(d, i){
					if(d.id == id) { index = i; return true }
					else return false
				})
			return index
		})

	d3.selectAll("select.dimension.menu").each(function(name,i){
		this.selectedIndex = selectedIndices[i]
	})

	update()
}

function selectedDimensions() {
	var map = {}
	d3.selectAll("select.dimension.menu")[0].forEach(function(select){
		map[select.__data__] = select.selectedOptions.item(0).__data__
	})
	return map
}

function update() {

	var range = [0, 700]
	var dimension = selectedDimensions()

	localStorage.setItem("vertical", dimension.vertical.id)
	localStorage.setItem("horizontal", dimension.horizontal.id)

	d3.selectAll("a.dimension.menu.link")
		.attr("href", function(name){
			var d = dimension[name]
			if(d) return d.id
			else return "#"
		})

	var xScale = scaleForDimension(dimension.horizontal, range)
	var yScale = scaleForDimension(dimension.vertical, range)

	var xAxis = d3.svg.axis()
		.tickSize(-30, 0)
		.orient("bottom")
		.scale(xScale)

	var yAxis = d3.svg.axis()
		.tickSize(30, 0)
		.orient("left")
		.scale(yScale)

	d3.select("g.x.axis").call(xAxis)
	d3.select("g.y.axis").call(yAxis)

	d3.selectAll("g.x.axis text")
		.style("text-anchor", "end")
		.attr("transform", "translate(-10, -35) rotate(60) scale(1, -1)")

	d3.selectAll("g.y.axis text")
		.attr("transform", "translate(-5, 0) scale(1, -1)")

	var x = valueScale(dimension.horizontal, xScale, -20)
	var y = valueScale(dimension.vertical, yScale, -20)

	var circle_instances = d3.select("#space")
		.selectAll("circle.instance")
		.data(bulk.instances)

	circle_instances.enter()
		.append("circle")
		.attr("class", "instance")
		.style({
			"fill": Ivar("color"),
			"stroke": Ivar("color")
		})
		.on("mouseenter", show)

	circle_instances
		.attr({
			cx: x,
			cy: y
		})

	circle_instances.exit()
		.remove()

	updateFormulaLegend()

	function scaleForDimension(dimension, range) {
		var domain
		if(dimension.isNumeric) {
			domain = domainOfNumericDimensionWithID(dimension.id)
		}
		var scale
		if(domain) {
			return d3.scale.linear()
				.domain(domain)
				.range(range)

		} else {
			return d3.scale.ordinal()
				.domain(dimension.values)
				.rangeRoundPoints(range)
		}
	}

	function valueScale(dimension, scale, defaultValue) {
		var id = dimension.id
		return function(instance) {
			var d = instance.dimensions.find(function(d){return d.id == id})
			if (d) {
				var v = d.type == "Link" ? "{link}" : d.value
				return scale(v)
			} else {
				return defaultValue
			}
		}
	}

	function show(){
		var space = d3.select("#space")
		var p = d3.mouse(space.node())
		var clicked = hitTest(p)
		var clickedInstances = space.selectAll("circle.instance").filter(clicked).data()
		listInstances(clickedInstances)
	}

	function hitTest(point) {
		return function(d) {
			var circle = d3.select(this),
				cx = +circle.attr("cx"),
				cy = +circle.attr("cy"),
				r = +circle.style("r").match(/\d*/),
				w = +circle.style("stroke-width").match(/\d*/)

			return Math.hypot(point[0] - cx, point[1] - cy) <= r + (w / 2)
		}
	}
}

function listInstances(instances) {
	var div_instances = d3.select("#selection")
		.selectAll("div")
		.data(instances)

	div_instances.enter()
		.append("div")
		.append("a")

	div_instances
		.select("a")
		.attr("href", Ivar("id"))
		.text(Ivar("name"))

	div_instances.exit()
		.remove()
}

function buildMenu(selection) {

	var text = function(dimension) {
		var count = instancesWithDimension(dimension).length
		return dimension.name + " (" + count + ")"
	}

	var li_dimension = selection.append("div")
		.selectAll("div")
		.data(["vertical", "horizontal"])
		.enter()
		.append("div")
		.attr("class", "dimension menu item")

	li_dimension
		.append("div")
		.append("a")
		.attr("class", "dimension menu link")
		.text(I)

	li_dimension
		.append("div")
		.append("select")
		.attr("class", "dimension menu")
		.on("change", update)
		.selectAll("option")
		.data(bulk.dimensions.sort(function(l, r){
			if(l.name < r.name) return -1
			else return 1
		}))
		.enter()
			.append("option")
			.text(text)

	selection.append("div")
		.attr("id", "selection")
	
	// Add link to 3D visualization
	selection.append("div")
		.style("margin-top", "2em")
		.style("text-align", "left")
		.html('<a href="3d/" style="color: #4169E1; text-decoration: none; font-size: 1.1em;">' +
			'Explore in 3D' +
			'</a>')
}

function updateFormulaLegend() {

    var isFormulaInSpace = formulasInSpaceMap()
    var formulasInSpace = listFormulasInSpace(bulk.tree.children)

	// color

	// var color = colorScale(formulasInSpace)

	// d3.selectAll("#space circle.instance").style("fill", function(d){
	// 	var formula = bulk.formulas.firstWhose("id", d.formula.id)
	// 	if(formula) return formula.color
	// 	else return "rgba(0,0,0,0.25)"
	// })

	// dom

    var legend = d3.select("#legend").html("")

    bulk.tree.children.forEach(function(formula){
    	appendFormulaIfInSpace(formula, legend)
    })

    // functions

    function colorScale(domain) {
		var range = d3.range(domain.length).map(function(i){
			return "hsla("+Math.round(180*i/(domain.length-1))+",100%,50%,0.5)"
		})
		var color = d3.scale.ordinal().domain(domain).range(range)
		return function(id) {
			if(isFormulaInSpace[id]) {
				return color(id)
			} else {
				return "none"
			}
		}
    }

    function formulasInSpaceMap() {
    	var isFormulaInSpace = {}
		d3.selectAll("#space circle.instance").filter(function(d){
	        return this.cx.baseVal.value >= 0 || this.cy.baseVal.value >= 0
	    }).data().forEach(function(instance){
    		isFormulaInSpace[instance.formula.id] = true
    	})
    	return isFormulaInSpace
    }

    function listFormulasInSpace(children, accumulator) {
    	var a = []
    	if (accumulator && accumulator.length) {
    		a = accumulator
    	}
    	if (children && children.length) {
	    	children.forEach(function(child){
	    		if (isFormulaInSpace[child.id]) {
	    			a.push(child.id)
	    		}
	    		a.concat(listFormulasInSpace(child.children, a))
	    	})
    	}
    	return a
    }

    function appendFormulaIfInSpace(formula, selection) {

    	var div = selection.append("div")
    		.style({
    			cursor: "default",
    			"margin-left": "2em"
    		})

    	var title_div = div.append("div")
			.on("mouseover", function(){
				d3.selectAll("#space circle.instance")
					.classed("emphasis", function(instance){
						return instance.formula.id == formula.id
					})
			})
			.on("mouseout", function(){
				d3.selectAll("#space circle.instance")
					.classed("emphasis", false)
			})

		// var c = color(formula.id)
		// if (c == "none") c = "rgba(0,0,0,0.05)"

		var c = "transparent"
		var f = bulk.formulas.firstWhose("id", formula.id)
		if(f) c = f.color

    	title_div.append("span")
    		.text("█")
    		.style({
    			color: c,
    			"margin-right": "0.25em"
    		})

		title_div.append("span")
			.append("a")
			.attr("href", formula.id)
    		.text(formula.name)

    	if (formula.children) {
    		formula.children.forEach(function(child){
    			appendFormulaIfInSpace(child, div)
    		})
    	}
    }
}

function buildErrors(selection) {

	var header = selection.append("header")
		.style("cursor", "pointer")
		.style("user-select", "none")
		.style("padding", "10px 0")
		.style("width", "100%")
		.style("box-sizing", "border-box")
		.style("border-top", "1px solid #e0e0e0")
		.on("click", function() {
			var article = d3.select("#errors article");
			var arrow = d3.select("#errors .arrow");
			var hint = d3.select("#errors .hint");
			var isHidden = article.style("display") === "none";
			article.style("display", isHidden ? "block" : "none");
			arrow.text(isHidden ? "▼" : "▶");
			hint.style("display", isHidden ? "none" : "inline");
		})

	header.append("span")
		.attr("class", "arrow")
		.style("margin-right", "0.5em")
		.text("▶")

	header.append("span")
		.text("Data Completeness Report")
		.style("font-size", "1.2em")
		.style("font-weight", "300")
		
	header.append("span")
		.attr("class", "hint")
		.text(" (click to expand)")
		.style("font-size", "0.8em")
		.style("color", "#999")
		.style("margin-left", "0.5em")

	var article = selection.append("article")
		.style("display", "none")  // Hidden by default
		.style("margin-top", "10px")
		.style("padding", "10px 0")

	appendErrors(bulk.dimensions, article)
	appendErrors(bulk.formulas, article)
	appendErrors(bulk.instances, article)
	appendErrors(bulk.untyped, article)
}

function appendErrors(faces, article) {

	var facesWithErrors = faces.filter(function(f){return f.errors.length > 0})
	if (facesWithErrors.length == 0) return

	var type = faces[0].type

	var ul = article.append("ul")

	ul.append("h2")
		.text(type)

	var li = ul.selectAll("li")
		.data(facesWithErrors);

	var errors_enter = li.enter()
		.append("li")

	errors_enter.append("a")
		.attr("href", Ivar("id"))
		.text(Ivar("name"));
			
	errors_enter.append("ul").selectAll("li")
		.data(Ivar("errors"))
		.enter()
		.append("li")
		.text(String);
}



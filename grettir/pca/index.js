
function visualizeComponent(div, componentNumber) {

	var component = pca.components[componentNumber - 1]
	var pcKey = "pc_"+componentNumber
	var values = pca.examples.map(Ivar(pcKey))

	var xScale = d3.scale.linear()
		.domain(d3.extent(values))
		.range([0, 800])

	var colorScaleForward = d3.scale.linear()
		.domain(d3.extent(pca.examples.map(Ivar("pc_3"))))
		.range([240, 0])

	var colorScaleReverse = d3.scale.linear()
		.domain(d3.extent(pca.examples.map(Ivar("pc_3"))))
		.range([0, 240])

	var colorScale = component.flip ? colorScaleReverse : colorScaleForward

	var vis = div.append("div")
		.attr({
			"class": "visualization"
		})
		.style("opacity", component.normalizedVariance)

	var svg = vis.append("svg")
		.attr({
			viewBox: "0 0 1000 400",
			preserveAspectRatio: "xMaxYMin meet"
		})
	
	var detail = vis.append("div")
		.attr("class", "detail component")

	var updateDetail = detailIn(detail)

	svg.append("rect")
		.attr({
			width: 1000,
			height: 400,
			fill: "transparent"
		})

	var space = svg.append("g")
		.attr({
			class: "space",
			transform: "translate(100, 100)"
		})

	space.append("path")
		.attr({
			d: "M0,0L800,0"
		})
		.style({
			stroke: "lightgray"
		})

	var select = selectIn(space, updateDetail)

	svg.call(select)

	// instances:

	var instances = space.selectAll("g.instance")
		.data(pca.examples)
			.enter()
			.append("g")
			.attr({
				class: "instance",
				transform: function(d){
					return "translate("+xScale(d[pcKey])+", 0)"
				}
			})

	instances
		.append("circle")
		.style({
			fill: function(d){ 
				if(componentNumber == -3) {
					return "hsl("+colorScale(d.pc_3)+", 100%, 50%)" 
				} else {
					return "black"
				}
			}
		})
		.on("mouseenter", function(d){
			var instance = bulk.instances.firstWhose("id", d.id)
			if (instance) {
				updateDetail([instance])
			} else {
				console.warn("missing instance with id", d.id)
				detail.text("name unknown for "+d.id)
			}
		})
		.on("mouseout", function(){ updateDetail(select.selectedInstances) })

	instances
		.append("text")
			.text(Ivar("number"))
			.attr({
				"font-size": 14,
				dx: 0, 
				dy: "0.35em"
			})
			.style({
				"pointer-events": "none",
				"text-anchor": "middle"
			})

	// contributions:

	var contributions = component.vector
	var contributionValues = contributions.map(Ivar("relevance"))
	var maxAbsContribution = d3.max(contributionValues.map(Math.abs))
	var opacityScale = d3.scale.linear()
		.domain([-maxAbsContribution, 0, maxAbsContribution])
		.range([1, 0, 1])

	var negativeContributions = contributions.filter(function(d){ return d.relevance < 0 })
	var positiveContributions = contributions.filter(function(d){ return d.relevance > 0 }).reverse()

	space.selectAll("text.negative.contribution")
		.data(negativeContributions)
		.enter()
		.append("text")
		.attr({
			class: "negative contribution",
			"font-size": 24,
			x: 0,
			y: function(d, i){ return i * 24 + 42 },
			"fill-opacity": function(d){ return opacityScale(d.relevance) }
		})
		.text(Ivar("attribute"))

	space.selectAll("text.positive.contribution")
		.data(positiveContributions)
		.enter()
		.append("text")
		.attr({
			class: "positive contribution",
			"font-size": 24,
			"text-anchor": "end",
			x: 800,
			y: function(d, i){ return i * 24 + 42 },
			"fill-opacity": function(d){ return opacityScale(d.relevance) }
		})
		.text(Ivar("attribute"))

	// flip label:

	component.flipLabel = function(){ return this.flip ? "←" : "→" }

	var flipLabel = svg.append("text")
		.text(component.flipLabel())
		.attr({
			"font-size": 24,
			x: 42,
			y: 42
		})
		.style({
			cursor: function(d){ return componentNumber == 3 ? "pointer" : "inherit" }
		})

	if(componentNumber == 3) {
		flipLabel.on("click", function(){
			component.flip = !component.flip
			this.textContent = component.flipLabel()
			localStorage.pcaFlipList = pca.components.map(Ivar("flip"))
			colorScale = component.flip ? colorScaleReverse : colorScaleForward
			space.selectAll(".instance circle").style("fill", function(d){ 
				return "hsl("+colorScale(d[pcKey])+", 100%, 50%)" 
			})
			if(componentNumber == 3) {
				d3.select(".space").selectAll(".instance circle").style("fill", function(d){ 
					var example = pca.examples.firstWhose("number", d.number)
					if(example) {
						return "hsl("+colorScale(example.pc_3)+", 100%, 50%)" 
					}
					return "black"
				})
			}
		})
	}

	// name label:

	var nameLabel = "PC "+ componentNumber
	if (componentNumber == 1) nameLabel = "X"
	if (componentNumber == 2) nameLabel = "Y"
	// if (componentNumber == 3) nameLabel = "Colour"

	svg.append("text")
		.text(nameLabel + " (" + Math.round(component.variance * 100) + "%)")
		.attr({
			"font-size": 24,
			x: 84,
			y: 42
		})
}

function visualizeGraph2D(div) {

	var pc_1 = pca.examples.map(Ivar("pc_1"))
	var pc_2 = pca.examples.map(Ivar("pc_2"))
	var pc_3 = pca.examples.map(Ivar("pc_3"))

	var pc_2_scale = pca.components[1].variance / pca.components[0].variance
	var pc_2_range = [0, 1]
	pc_2_range[0] = 800 * (1 - pc_2_scale) / 2
	pc_2_range[1] = 800 - pc_2_range[0]

	var pc_3_scale = pca.components[2].variance / pca.components[1].variance

	var xScale = d3.scale.linear()
		.domain(d3.extent(pc_1))
		.range([0, 800])

	var yScale = d3.scale.linear()
		.domain(d3.extent(pc_2))
		.range(pc_2_range)

	var colorScale = d3.scale.linear()
		.domain(d3.extent(pc_3))
		.range(pca.components[2].flip ? [0, 240] : [240, 0])

	pca.examples.forEach(function(d, i){
		var instance = bulk.instances.firstWhose("id", d.id)
		if(!instance) {
			console.warn("Instance not found with id:", d.id)
			return
		}
		instance.number = d.number
		instance.x = xScale(d.pc_1)
		instance.y = yScale(d.pc_2)
		instance.color = "hsl("+colorScale(d.pc_3)+", "+Math.round(pc_3_scale * 100)+"%, 50%)"
	})

	var vis = div.append("div")
		.attr("class", "visualization")

	var svg = vis.append("svg")
		.attr({
			viewBox: "0 0 1000 1000",
			preserveAspectRatio: "xMaxYMin meet"
		})
	
	var detail = vis.append("div")
		.attr("class", "detail")

	var updateDetail = detailIn(detail)

	svg.append("rect")
		.attr({
			width: 1000,
			height: 1000,
			fill: "transparent"
		})

	var plot = svg.append("g")
		.attr({
			"class": "plot",
			transform: "translate(0, 1000) scale(1, -1)"
		})
	
	var space = plot.append("g")
		.attr({
			class: "space",
			transform: "translate(100, 100)"
		})

	var select = selectIn(space, updateDetail)
	
	svg.call(select)

	// instances:

	var pcaInstancesInBulk = bulk.instances.filter(function(bulkInstance){
		return undefined != pca.examples.firstWhose("id", bulkInstance.id)
	})

	var instances = space.selectAll("g.instance")
		.data(pcaInstancesInBulk)
			.enter()
			.append("g")
			.attr({
				"class": "instance",
				"transform": function(d){
					return "translate("+d.x+", "+d.y+")"
				}
			})

	instances
		.append("circle")
		.style({
			// "stroke": Ivar("color"),
			"fill": Ivar("color")
		})
		.on("mouseenter", function(d){
			var instance = bulk.instances.firstWhose("id", d.id)
			if (instance) {
				updateDetail([instance])
			} else {
				console.warn("missing instance with id", d.id)
				detail.text("name unknown for "+d.id)
			}
		})
		.on("mouseout", function(){ updateDetail(select.selectedInstances) })

	instances
		.append("text")
			.text(Ivar("number"))
			.attr({
				transform: "scale(1, -1)",
				"font-size": 14,
				dx: 0, 
				dy: "0.35em"
			})
			.style({
				"pointer-events": "none",
				"text-anchor": "middle"
			})
}

function detailIn(div) {
	return function(instances) {
		var list = div.selectAll("div")
			.data(instances.sort(function(a, b){ return a.number - b.number }))

			list.enter().append("div")

			list.text(function(d){ return d.number + ".\t\t" + d.name })

			list.exit().remove()
	}
}

function selectIn(container, handler) {

    var drag = d3.behavior.drag()

	drag.selectionPoints = []
	drag.selectedInstances = []

    var selection = container.append("path")
    	.attr("class", "selection")

	var line = d3.svg.line()
    	.x(function(d){ return d[0] })
    	.y(function(d){ return d[1] })
    	.interpolate("basis")

	drag.on("dragstart", function(){
			d3.event.sourceEvent.stopPropagation()
			drag.selectionPoints = []
		})
		.on("drag", function(){
			d3.event.sourceEvent.stopPropagation()
			var p = d3.mouse(container.node())
			drag.selectionPoints.push(p)
			selection.attr("d", line(drag.selectionPoints))
		})
		.on("dragend", function(){
			d3.event.sourceEvent.stopPropagation()
			if(drag.selectionPoints.length > 2){
				drag.selectionPoints.push(drag.selectionPoints[0])
				selection.attr("d", line(drag.selectionPoints) + "Z")
			} else {
				selection.attr("d", "")
			}
			drag.selectedInstances = container.selectAll("g.instance")
				.filter(function(d, i) {
					var p = d3.select(this).attr("transform").match(/(-?\d|\.)+/g).map(parseFloat)
    				return isPointInPolygon(p, drag.selectionPoints)
			    })
			    .data()

			if(handler) handler(drag.selectedInstances)
		})

	return drag
}

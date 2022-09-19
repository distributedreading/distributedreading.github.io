
var bulk;

function setBulk(data) {

	bulk = data

	// count and sort dimensions

	bulk.dimensions.forEach(function(d){
		d.count = instancesWithDimension(d).length
	})
	bulk.dimensions.sort(function(d1,d2){
		return d2.count - d1.count
	})

	// sort formulas

	bulk.formulas.sort(function(f1,f2){
		if (f1 == f2) return 0
		return f1.name < f2.name ? -1 : 1
	})

	// instance color

	bulk.instances.forEach(function(instance){
		instance.color = colorForInstance(instance)
	})
}

function instancesWithDimension(dimension) {
	var id = dimension.id
	return bulk.instances.filter(function(instance){
		return instance.dimensions.findIndex(function(d){
			return d.id == id
		}) >= 0
	})
}

function colorForInstance(instance) {
	var formula = bulk.formulas.firstWhose("id", instance.formula.id)
	if(formula) return formula.color
	else return "rgba(0,0,0,0.5)"
}

function domainOfNumericDimensionWithID(id) {
	var dimension = bulk.dimensions.firstWhose("id", id)
	if (dimension.minNumber && dimension.maxNumber) {
		return [dimension.minNumber, dimension.maxNumber]
	}
	var values = []
	bulk.instances.forEach(function(instance){
		var d = instance.dimensions.firstWhose("id", id)
		if (d == undefined) return
		var n = +d.value
		if (n == undefined) return
		values.push(n)
	})
	return d3.extent(values)
}



function selectRandomDimensions() {
	d3.selectAll("select").each(function(d){
		this.selectedIndex = Math.floor(
			Math.random() * (data.dimensions.length - 2) + 1
		)
	})
}

function selectFirstDimensions() {
	d3.selectAll("select.dimension.menu").each(function(d,i){
		this.selectedIndex = i + 1
	})
}

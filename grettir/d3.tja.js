var nop = function(d){};
var constant = function(d){return function(){return d;};};
var I = function(d){return d;};

var Ivar = function(path) {
  var p = path.split(".");
  return function(o) {
    var x = o;
    for (var i = 0; i < p.length; i++) {
      x = x[p[i]];
      if(x === undefined) {
      	return undefined;
      }
    }
    return x;
  };
};

Array.prototype.firstWhose = function(path, value) {
  var p = Ivar(path);
  return this.find(function(e) {
    return p(e) == value;
  });
};

Array.prototype.allWhose = function(path, value) {
  var p = Ivar(path);
  return this.filter(function(e) {
    return p(e) == value;
  });
};

var tja = {};

// http://bl.ocks.org/bycoffe/5575904
// points are arrays
function isPointInPolygon(point, vertices) {
  // ray-casting algorithm based on
  // http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html
  var xi, xj, i, intersect,
      x = point[0],
      y = point[1],
      inside = false;
  for (var i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    xi = vertices[i][0],
    yi = vertices[i][1],
    xj = vertices[j][0],
    yj = vertices[j][1],
    intersect = ((yi > y) != (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// d3:

d3.selection.prototype.eachText = function(convert) {
  var a = this[0].map(Ivar("textContent"))
  if (convert) return a.map(convert)
  else return a
}

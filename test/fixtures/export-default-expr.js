var o = {
	getter: function () { return o },
	set setter(value) { o.prop2 = value },
	prop1: null,
	prop2: null
}
var a

export default a = o.getter().prop1 = o.setter = function () { return 'a' }

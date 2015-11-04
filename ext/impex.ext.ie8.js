/**
 * ie8是一个用于impex兼容低版本ie的扩展包
 * 支持
 * <ul>
 * 		<li>所有内置标签</li>
 * 		<li>表达式语法</li>
 * 		<li>其他特性</li>
 * </ul>
 */
;!function(){

	Object.create = Object.create || function(proto) {
		var rs = {};
		if (proto) {
			for ( var p in proto) {
				rs[p] = proto[p];
			}
		}
		return rs;
	}

	Object.keys = Object.keys || function(obj){
		var rs = [];
		for(var k in obj){
			if(obj.hasOwnProperty(k)){
				rs.push(k);
			}
		}
		return rs;
	}
	
	Array.prototype.indexOf = Array.prototype.indexOf || function(item){
		for(var i=this.length;i--;){
			if(item === this[i])return i;
		}
		return -1;
	}

	Date.now = Date.now || function(){
		return new Date().getTime();
	}
}();
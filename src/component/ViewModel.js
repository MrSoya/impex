/**
 * @classdesc 视图模型类，提供组件关联模型的操作
 * @class 
 */
function ViewModel () {
}
ViewModel.prototype = {
	/**
	 * 设置或者获取模型值，如果第二个参数为空就是获取模型值<br/>
	 * 设置模型值时，设置的是当前域的模型，如果当前模型不匹配表达式，则赋值无效<br/>
	 * 获取模型值时，会从当前域向上查找，直到找到匹配对象，如果都没找到返回null
	 * @param  {string} path 表达式路径
	 * @param  {var} val  值
	 * @return this
	 */
	data:function(path,val){
		var expObj = lexer(path);
		var evalStr = Renderer.getExpEvalStr(this,expObj);
		if(arguments.length > 1){
			if(Util.isObject(val) || Util.isArray(val)){
				val = JSON.stringify(val);
			}else 
			if(Util.isString(val)){
				val = '"'+val.replace(/\r\n|\n/mg,'\\n').replace(/"/mg,'\\"')+'"';
			}
			//fix \r\n on IE8
			eval(evalStr + '= '+ val +'');
			return this;
		}else{
			return eval(evalStr);
		}
	},
	/**
	 * 查找拥有指定属性的最近的祖先组件
	 * @param  {string} path 表达式路径
	 * @return {Component}
	 */
	closest:function(path){
		var expObj = lexer(path);
		var evalStr = Renderer.getExpEvalStr(this,expObj);
		evalStr.replace(/^impex\.__components\["(C_[0-9]+)"\]/,'');
		return impex.__components[RegExp.$1];
	}
}
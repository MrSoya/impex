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
			eval(evalStr + '= "'+ val.replace(/\n/mg,'\\n') +'"');
			return this;
		}else{
			return eval(evalStr);
		}
	}
}
/**
 * 构建器
 */

var Builder = new function() {
	//预链接
	function prelink(comp){
		//build expressions
		for(var i=comp.__expNodes.length;i--;){
			var expNode = comp.__expNodes[i];
			for(var expStr in expNode.expMap){
				var lexInfo = expNode.expMap[expStr];
				var varTree = lexInfo.varTree;

				//遍历表达式中的所有变量串
				for(var varStr in varTree){
					var varObj = varTree[varStr];

					//监控变量
					buildExpModel(comp,varObj,expNode);
				}
			}
		}
	}

 	function buildExpModel(comp,varObj,expNode){
 		for(var subV in varObj.subVars){
 			var subVar = varObj.subVars[subV];
 			buildExpModel(comp,subVar,expNode);
 		}

 		//build parent props
 		if(varObj.segments[0]==='this' && varObj.segments[1]==='props'){
 			var k = varObj.segments[2];
 			if(!k)return;
 			if(k[0]==='['){
 				if(expNode instanceof ExpNode){
 					comp.__expWithProps['*'].push(expNode);
		 		}else if(expNode instanceof AttrObserveNode){
		 			comp.__directiveWithProps['*'].push(expNode);
		 		}else if(expNode instanceof Watch){
 					comp.__watchWithProps['*'].push(expNode);
 				}
 			}else{
 				if(expNode instanceof ExpNode){
 					if(!comp.__expWithProps[k])comp.__expWithProps[k] = [];
 					comp.__expWithProps[k].push(expNode);
		 		}else if(expNode instanceof AttrObserveNode){
		 			if(!comp.__directiveWithProps[k])comp.__directiveWithProps[k] = [];
 					comp.__directiveWithProps[k].push(expNode);
		 		}else if(expNode instanceof Watch){
 					if(!comp.__watchWithProps[k])comp.__watchWithProps[k] = [];
 					comp.__watchWithProps[k].push(expNode);
 				}
 				
 			}
 			return;
 		}

 		var prop = walkDataTree(comp.__expDataRoot.subProps,varObj.segments[0],expNode);
 		
 		for(var i=1;i<varObj.segments.length;i++){
 			prop = walkDataTree(prop.subProps,varObj.segments[i],expNode);
 		}
 	}
 	this.buildExpModel = buildExpModel;

 	function walkDataTree(parentProp,propName,expNode){
 		var prop = parentProp[propName];
 		if(!prop){
 			prop = parentProp[propName] = new ExpData(propName);
 		}
 		if(expNode instanceof ExpNode){
 			if(prop.expNodes.indexOf(expNode) < 0)
 				prop.expNodes.push(expNode);
 		}else 
 		if(expNode instanceof AttrObserveNode){
 			if(prop.attrObserveNodes.indexOf(expNode) < 0)
 				prop.attrObserveNodes.push(expNode);
 		}else 
 		if(expNode instanceof Watch){
 			if(prop.watchs.indexOf(expNode) < 0)
 				prop.watchs.push(expNode);
 		}

 		return parentProp[propName];
 	}

	/**
	 * 构建组件
	 */
	this.build = function(component){
		prelink(component);
	}

}
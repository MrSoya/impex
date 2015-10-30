/**
 * 构建器
 */

var Builder = new function() {
	//预链接
	function prelink(comp){
		//build expressions
		for(var i=comp.$__expNodes.length;i--;){
			var expNode = comp.$__expNodes[i];
			for(var expStr in expNode.expMap){
				var lexInfo = expNode.expMap[expStr];
				var varTree = lexInfo.varTree;

				//遍历表达式中的所有变量串
				for(var varStr in varTree){
					var varObj = varTree[varStr];

					//监控变量
					buildExpModel(comp,varObj,varStr,expNode);
				}
			}
		}

		//build components
		for(var i=comp.$__components.length;i--;){
			var subComp = comp.$__components[i];
			if(comp.$__directives.indexOf(subComp) > -1)continue;

			//激活组件
			subComp.init();
			subComp.display();
		}

		//build directives
		for(var i=comp.$__directives.length;i--;){
			var directive = comp.$__directives[i];

			directive.init();
		}
	}

	

 	function buildExpModel(ctrlScope,varObj,varStr,expNode){
 		for(var subV in varObj.subVars){
 			var subVar = varObj.subVars[subV];
 			buildExpModel(ctrlScope,subVar,subV,expNode);
 		}

 		var prop = walkPropTree(ctrlScope.$__expPropRoot.subProps,varObj.segments[0],expNode);
 		
 		for(var i=1;i<varObj.segments.length;i++){
 			var renderTag = i == varObj.segments.length?true:false;
 			prop = walkPropTree(prop.subProps,varObj.segments[i],expNode);
 		}
 		
 	}

 	this.buildExpModel = buildExpModel;

 	function walkPropTree(parentProp,propName,expNode){
 		var prop = parentProp[propName];
 		if(!prop){
 			prop = parentProp[propName] = new ExpProp(propName);
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
		
		var depth = 0;
		observerProp(component,[],component,depth+1);
	}

	function observerProp(model,propChain,ctrlScope,depth){
		if(depth > DEPTH)return;
		var recur = false;

		if(Util.isArray(model)){
			model.$__observer = function(changes){
				changeHandler(changes,propChain,ctrlScope,depth);
			}
			Array_observe(model,model.$__observer);

			recur = true;
		}else if(Util.isObject(model)){
			if(Util.isDOM(model))return;
			if(Util.isWindow(model))return;
			model.$__observer = function(changes){
				changeHandler(changes,propChain,ctrlScope,depth);
			}
			Object_observe(model,model.$__observer);

			recur = true;
		}

		if(recur){
			//recursive
			var ks = Object.keys(model);

			for(var i=ks.length;i--;){
				var k = ks[i];
				if(k.indexOf('$')===0)continue;
				var pc = propChain.concat();
				pc.push(k);
				observerProp(model[k],pc,ctrlScope,depth+1);
			}
		}
	}

	function changeHandler(changes,propChain,ctrlScope,depth){
		for(var i=changes.length;i--;){
			var change = changes[i];

			var propName = change.name || change.index;
			if(propName.indexOf && propName.indexOf('$')===0)
				continue;

			var newObj = change.object[propName];
			//查询控制域
			var pc = propChain.concat();
			if(change.name)
				pc.push(propName);
			//recursive
			recurRender(ctrlScope,pc,change.type,newObj,change.oldValue);

			//unobserve
			if(Util.isArray(change.oldValue)){
				Array_unobserve(change.oldValue,change.oldValue.$__observer);
			}else if(Util.isArray(change.object) && !change.oldValue){
				Array_unobserve(change.object,change.object.$__observer);
				Array_observe(change.object,change.object.$__observer);
			}else if(Util.isObject(change.oldValue)){
				Object_unobserve(change.oldValue,change.oldValue.$__observer);
				change.oldValue.$__observer = null;
			}

			//reobserve
			observerProp(newObj,pc,ctrlScope,depth);
			
		}
	}

	function rerender(ctrlScope,propChain,changeType,newVal,oldVal){
		var props = ctrlScope.$__expPropRoot.subProps;
		var prop;
		for(var i=0;i<propChain.length;i++){
			var p = propChain[i];
			if(props[p]){
				prop = props[p];
				props = props[p].subProps;
				continue;
			}
			break;
		}

		if(!prop)return;

		//如果props都是中括号符号，那么propChain无法匹配，
		//那么就从最近一级匹配到的prop，以及i的长度，
		//来检索符合条件的表达式映射节点，然后rerender对应的expNodes
		var findLength = propChain.length - i;
		var matchs = [];
		if(findLength > 0){
			findMatchProps(prop,findLength,matchs);
		}else{
			matchs.push(prop);	
		}
		
		var invokedWatchs = [];
		for(var i=matchs.length;i--;){
			//rerender matchs
			for(var j=matchs[i].expNodes.length;j--;){
				var expNode = matchs[i].expNodes[j];
				Renderer.renderExpNode(expNode);
			}
			//callback observe attrs
			for(var j=matchs[i].attrObserveNodes.length;j--;){
				var aon = matchs[i].attrObserveNodes[j];

				var rs = Renderer.evalExp(aon.directive,aon.expObj);
				aon.directive.observe(rs);
			}
			//callback watchs
			for(var j=matchs[i].watchs.length;j--;){
				var watch = matchs[i].watchs[j];

				if(watch.segments.length != propChain.length)continue;

				//compare 2 segs
				var canWatch = true;
				for(var k=0;k<watch.segments.length;k++){
					if(watch.segments[k][0] != '[' && 
						propChain[k][0] != '[' && 
						watch.segments[k] != propChain[k]){
						canWatch = false;
						break;
					}
				}

				if(canWatch && invokedWatchs.indexOf(watch) < 0){
					watch.cbk && watch.cbk.call(watch.ctrlScope,changeType,newVal,oldVal);
					invokedWatchs.push(watch);
				}
			}
		}
	}
	function findMatchProps(prop,findLength,matchs){
		if(findLength < 1){
			matchs.push(prop);
			return;
		}
		for(var k in prop.subProps){
			findMatchProps(prop.subProps[k],findLength-1,matchs);
		}
	}
	function recurRender(ctrlScope,propChain,changeType,newVal,oldVal){
		rerender(ctrlScope,propChain,changeType,newVal,oldVal);

		for(var j=ctrlScope.$__components.length;j--;){
			var subCtrlr = ctrlScope.$__components[j]
 			recurRender(subCtrlr,propChain,changeType,newVal,oldVal);
 		}
	}
}
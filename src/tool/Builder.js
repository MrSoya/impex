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
 			var renderTag = i === varObj.segments.length?true:false;
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

	function observerProp(model,propChain,component,depth){
		if(depth > DEPTH)return;
		var recur = false;

		function __observer(changes){
			if(component.$__state === Component.state.suspend)return;
			if(component.$__state === Component.state.destroyed)return;
			changeHandler(changes,propChain,component,depth);
		}
		if(Util.isArray(model)){
			if(model.$__impex__observer)return;
			model.$__impex__observer = __observer;
			model.$__impex__oldVal = model.concat();

			Array_observe(model,__observer);

			recur = true;
		}else if(Util.isObject(model)){
			if(Util.isDOM(model))return;
			if(Util.isWindow(model))return;
			if(model.$__impex__observer)return;
			model.$__impex__observer = __observer;

			Object_observe(model,__observer);

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
				observerProp(model[k],pc,component,depth+1);
			}
		}
	}

	function changeHandler(changes,propChain,component,depth){
		if(Util.isString(changes))return;

		for(var i=changes.length;i--;){
			var change = changes[i];

			var propName = change.name;
			if(propName && propName.indexOf('$')===0)
				continue;

			var newObj = change.object[propName];
			//查询控制域
			var pc = propChain.concat();
			if(propName && !Util.isArray(change.object))
				pc.push(propName);

			//recursive
			var oldVal = change.oldValue;
			if(Util.isArray(change.object)){
				newObj = change.object;
				oldVal = change.object.$__impex__oldVal;
			}
			recurRender(component,pc,change.type,newObj,oldVal);

			//unobserve
			if(!Util.isArray(change.object) && Util.isArray(change.oldValue)){
				Array_unobserve(change.oldValue,change.oldValue.$__impex__observer);
			}else if(Util.isArray(change.object)){
				change.object.$__impex__oldVal = change.object.concat();
				return;
			}else if(Util.isObject(change.oldValue)){
				var observer = change.oldValue.$__impex__observer;
				if(observer){
					Object_unobserve(change.oldValue,observer);
					change.oldValue.$__impex__observer = null;
				}
			}

			//reobserve
			observerProp(newObj,pc,component,depth);
		}
	}

	function rerender(component,propChain,changeType,newVal,oldVal){
		var props = component.$__expPropRoot.subProps;
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
			Renderer.renderExpNode(matchs[i].expNodes);
			//callback observe attrs
			for(var j=matchs[i].attrObserveNodes.length;j--;){
				var aon = matchs[i].attrObserveNodes[j];

				var rs = Renderer.evalExp(aon.directive,aon.expObj);
				aon.directive.observe(rs);
			}
			//callback watchs
			for(var j=matchs[i].watchs.length;j--;){
				var watch = matchs[i].watchs[j];

				if(watch.segments.length < propChain.length)continue;
				if(invokedWatchs.indexOf(watch) > -1)continue;

				//compare segs
				var canWatch = true;
				for(var k=0;k<watch.segments.length;k++){
					if(!propChain[k])break;

					if(watch.segments[k][0] !== '[' && 
						propChain[k][0] !== '[' && 
						watch.segments[k] !== propChain[k]){
						canWatch = false;
						break;
					}
						
				}

				if(canWatch){
					var nv = newVal,
					ov = oldVal;
					if(watch.segments.length > propChain.length){
						var findSegs = watch.segments.slice(k);
						var findStr = '$var';
						for(var k=0;k<findSegs.length;k++){
							var seg = findSegs[k];
							findStr += seg[0]==='['?seg:'.'+seg;
						}
						try{
							nv = new Function("$var","return "+findStr)(newVal);
							ov = new Function("$var","return "+findStr)(oldVal);
						}catch(e){
							impex.console.debug('error on parse watch params');
							nv = null;
						}
					}
					watch.cbk && watch.cbk.call(watch.ctrlScope,changeType,nv,ov);
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
	function recurRender(component,propChain,changeType,newVal,oldVal){
		rerender(component,propChain,changeType,newVal,oldVal);

		for(var j=component.$__components.length;j--;){
			var subCtrlr = component.$__components[j]
 			recurRender(subCtrlr,propChain,changeType,newVal,oldVal);
 		}
	}
}
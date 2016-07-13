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

		//build components
		for(var i=comp.children.length;i--;){
			var subComp = comp.children[i];
			if(subComp instanceof Directive)continue;

			//激活组件
			subComp.init();
			subComp.display();
		}

		//build directives
		for(var i=comp.children.length;i--;){
			var subComp = comp.children[i];
			if(!(subComp instanceof Directive))continue;

			subComp.init();
		}
	}

 	function buildExpModel(ctrlScope,varObj,expNode){
 		for(var subV in varObj.subVars){
 			var subVar = varObj.subVars[subV];
 			buildExpModel(ctrlScope,subVar,expNode);
 		}

 		var prop = walkPropTree(ctrlScope.__expPropRoot.subProps,varObj.segments[0],expNode);
 		
 		for(var i=1;i<varObj.segments.length;i++){
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
	}

	var __propStr = null,
		__lastMatch = undefined;
	function changeHandler(change){

		var newVal = change.newVal;
		var oldVal = change.oldVal;
		var pc = change.pc;
		var xpc = change.xpc;
		var comp = change.comp;
		var type = change.type;
		var name = change.name;
		var object = change.object;

		
		handlePath(newVal,oldVal,comp,type,name,object,pc);

		xpc.forEach(function(pc){
			handlePath(newVal,oldVal,comp,type,name,object,pc);
		});
	}

	function handlePath(newVal,oldVal,comp,type,name,object,pc){
		__propStr = null;
        __lastMatch = undefined;
        var chains = [];
        if(pc[0] instanceof Directive){
        	var index = pc[2] === undefined?name:pc[2];

	        comp = pc[0].subComponents[parseInt(index)];
	        chains.push(pc[1]);
	        if(Util.isUndefined(pc[2]) && comp instanceof Component){
	        	comp.data[pc[1]] = newVal;
	        }
        }else{
        	chains = pc.concat();
			if(!Util.isArray(object))
	        chains.push(name);
        }
        
        if(!comp)return;

        recurRender(object,name,comp,chains,type,newVal,oldVal,0,comp);
        if(comp.__watcher instanceof Function){
        	comp.__watcher(type,newVal,oldVal,chains);
        }
	}

	this.handleChange = changeHandler;

	var sqbExp = /(^\[)|(,\[)/;
	function rerender(object,name,component,propChain,changeType,newVal,oldVal){
		var props = component.__expPropRoot.subProps;
		var prop;
		var hasSqb = false;
		for(var i=0;i<propChain.length;i++){
			var p = propChain[i];
			if(sqbExp.test(Object.keys(props).join(','))){
				hasSqb = true;
				break;
			}
			if(props[p]){
				prop = props[p];
				props = props[p].subProps;
				continue;
			}
			break;
		}
		if(!prop)return;

        var matchs = [];
        if(hasSqb){
            var findLength = propChain.length - i - 1;
            var spks = Object.keys(prop.subProps);
            for(var i=spks.length;i--;){
                var k = spks[i];
                if(k[0] === '[' || k === p){
                    findMatchProps(prop.subProps[k],findLength,matchs);
                }
            }
        }else {
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
							LOGGER.debug('error on parse watch params');
							nv = null;
						}
					}
					watch.cbk && watch.cbk.call(watch.ctrlScope,object,name,changeType,nv,ov,propChain);
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
	function recurRender(object,name,component,propChain,changeType,newVal,oldVal,depth,topComp){
		var toRender = true;
		if(depth > 0){
			if(!__propStr){
				__propStr = '';
				for(var k=0;k<propChain.length;k++){
					var seg = propChain[k];
					__propStr += seg[0]==='['?seg:'.'+seg;
				}
			}
			var prop = undefined;
            try{
                prop = eval('impex._cs["'+component.__id+'"]'+__propStr);
            }catch(e){}
            if(!Util.isUndefined(prop)){
            	__lastMatch = component;
                toRender = false;
            }else 
            if(__lastMatch && __lastMatch !== topComp)toRender = false;
		}
		if(toRender){
			rerender(object,name,component,propChain,changeType,newVal,oldVal);
		}
		if(component.isolate){
			var pc0 = propChain[0];
			for(var i=component.isolate.length;i--;){
				var k = component.isolate[i];
				if(k.indexOf('.')>0){
					var kc = k.split('.');
					var matchAll = true;
					for(var kci=0;kci<kc.length;kci++){
						if(kc[kci] !== propChain[kci]){
							matchAll = false;
						}
					}
					if(matchAll)return;
				}else if(k === pc0){
					return;
				}
			}
		}

		for(var j=component.children.length;j--;){
			var subCtrlr = component.children[j];
 			recurRender(object,name,subCtrlr,propChain,changeType,newVal,oldVal,depth+1,topComp);
 		}
	}
}
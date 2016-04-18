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
					buildExpModel(comp,varObj,expNode);
				}
			}
		}

		//build components
		for(var i=comp.$__components.length;i--;){
			var subComp = comp.$__components[i];
			if(subComp instanceof Directive)continue;

			//激活组件
			subComp.init();
			subComp.display();
		}

		//build directives
		for(var i=comp.$__components.length;i--;){
			var subComp = comp.$__components[i];
			if(!(subComp instanceof Directive))continue;

			subComp.init();
		}
	}

 	function buildExpModel(ctrlScope,varObj,expNode){
 		for(var subV in varObj.subVars){
 			var subVar = varObj.subVars[subV];
 			buildExpModel(ctrlScope,subVar,expNode);
 		}

 		var prop = walkPropTree(ctrlScope.$__expPropRoot.subProps,varObj.segments[0],expNode);
 		
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
		
		observerProp(component,[],component);
	}

	function observerProp(model,propChain,component){
		var isArray = Util.isArray(model),
			isObject = Util.isObject(model);
		if(!model || !(isArray || isObject)){
            return;
        }

        if(model.$__impex__observer){
            var k = propChain.join('.');
            if(model.$__impex__propChains[k]){
            	var pck = model.$__impex__propChains[k];
            	for(var i=pck.length;i--;){
            		if(pck[i][1] === component)return;
            	}
                pck.push([propChain,component]);
                return;
            }
            model.$__impex__propChains[propChain.join('.')] = [[propChain,component]];
            return;
        }

    	function __observer(changes){
			if(component.$__state === Component.state.suspend)return;
			if(component.$__state === null)return;

			changeHandler(changes);
		}

		model.$__impex__observer = __observer;
		model.$__impex__propChains = {};
        model.$__impex__propChains[propChain.join('.')] = [[propChain,component]];

		if(isArray){
			model.$__impex__oldVal = model.concat();

			Array_observe(model,__observer);
		}else if(isObject){
			if(Util.isDOM(model))return;

			Object_observe(model,__observer);
		}

		//recursive
		var ks = Object.keys(model);
		for(var i=ks.length;i--;){
			var k = ks[i];
			if(k.indexOf('$')===0)continue;
			var pc = propChain.concat();
			pc.push(k);
			observerProp(model[k],pc,component);
		}
	}

	var __propStr = null,
		__lastMatch = undefined;
	function changeHandler(changes){
		if(Util.isString(changes))return;

		for(var i=changes.length;i--;){
			var change = changes[i];

			var propName = change.name;
			if(propName && propName.indexOf('$')===0 && propName!=='$index')
				continue;

			var newObj = change.object[propName];
			//recursive
			var oldVal = change.oldValue;
			if(Util.isArray(change.object)){
				newObj = change.object;
				oldVal = change.object.$__impex__oldVal;
			}
			
			var pcs = change.object.$__impex__propChains;
            var pks = Object.keys(pcs);
            for(var pl=pks.length;pl--;){
                var k = pks[pl];
                var watchers = pcs[k];
                for(var wl=watchers.length;wl--;){
                    var propChain = watchers[wl][0];
                    var component = watchers[wl][1];
                    //查询控制域
                    var pc = propChain.concat();
                    if(propName && !Util.isArray(change.object))
                        pc.push(propName);

                    __propStr = null;
                    __lastMatch = undefined;
                    recurRender(component,pc,change.type,newObj,oldVal,0,component);
                    if(component.$__watcher instanceof Function){
                    	component.$__watcher(change.type,newObj,oldVal,pc);
                    }
                    //reobserve
                    observerProp(newObj,pc,component);
                }
            }

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
					change.oldValue.$__impex__propChains = null;
				}
			}
		}
	}

	var sqbExp = /(^\[)|(,\[)/;
	function rerender(component,propChain,changeType,newVal,oldVal){
		var props = component.$__expPropRoot.subProps;
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
            // if(i < propChain.length)return;
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
					watch.cbk && watch.cbk.call(watch.ctrlScope,changeType,nv,ov,propChain);
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
	function recurRender(component,propChain,changeType,newVal,oldVal,depth,topComp){
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
                prop = eval('impex.__components["'+component.$__id+'"]'+__propStr);
            }catch(e){}
            if(!Util.isUndefined(prop)){
            	__lastMatch = component;
                toRender = false;
            }else 
            if(__lastMatch && __lastMatch !== topComp)toRender = false;
		}
		if(toRender){
			rerender(component,propChain,changeType,newVal,oldVal);
		}
		if(component.$isolate){
			var pc0 = propChain[0];
			for(var i=component.$isolate.length;i--;){
				var k = component.$isolate[i];
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

		for(var j=component.$__components.length;j--;){
			var subCtrlr = component.$__components[j];
 			recurRender(subCtrlr,propChain,changeType,newVal,oldVal,depth+1,topComp);
 		}
	}
}
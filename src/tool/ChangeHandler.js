/**
 * 变更处理器，处理所有变量变更，并触发渲染
 */

var ChangeHandler = new function() {

	function mergeChange(change){
		for(var i=changeQ.length;i--;){
			var c = changeQ[i];
			if(c.object.__im__oid === change.object.__im__oid && c.name === change.name)break;
		}
		if(i > -1)
			changeQ.splice(i,1,change);
		else{
			changeQ.push(change);
		}
	}

	var combineChange = false;
	var changeQ = [];
	var expProps = [];

	this.handle = function (change){
		if(combineChange){
			mergeChange(change);
		}else{
			changeQ = [];
			expProps = [];
			combineChange = true;
			changeQ.push(change);
			setTimeout(function(){
				combineChange = false;

				changeQ.forEach(function(change){
					var newVal = change.newVal;
					var oldVal = change.oldVal;
					var pc = change.pc;
					var xpc = change.xpc;
					var comp = change.comp;
					var type = change.type;
					var name = change.name;
					var object = change.object;

					// console.log('处理变更',change);
					
					handlePath(newVal,oldVal,comp,type,name,object,pc);

					xpc.forEach(function(pc){
						handlePath(newVal,oldVal,comp,type,name,object,pc);
					});

					
				});//end for

				//render
				var expNodes = mergeExpNodes(expProps);
				Renderer.renderExpNode(expNodes);

				//callback observe attrs
				callObserves(expProps);
				//watch path
				callWatchs(expProps);

				//watch all
				changeQ.forEach(function(change){
					var newVal = change.newVal;
					var oldVal = change.oldVal;
					var pc = change.pc.concat();
					var comp = change.comp;
					var type = change.type;
					var name = change.name;
					var object = change.object;
					pc.push(name);

					if(comp.__watcher instanceof Function){
			        	comp.__watcher(object,name,type,newVal,oldVal,pc);
			        }
				});//end for
			},20);
		}
	}
	
	var __propStr = null,
		__lastMatch = undefined;
	function handlePath(newVal,oldVal,comp,type,name,object,pc){
		__propStr = null;
        __lastMatch = undefined;
        var chains = [];
        if(pc[0] instanceof Directive){
        	var index = pc[2] === undefined?name:pc[2];

	        comp = pc[0].subComponents[parseInt(index)];
	        chains.push(pc[1]);
	        if(Util.isUndefined(pc[2]) && comp instanceof Component){
	        	comp.data.__im__target[pc[1]] = newVal;
	        }
        }else{
        	chains = pc.concat();
			if(!Util.isArray(object))
	        chains.push(name);
        }
        
        if(!comp)return;

        findExpProp(object,name,comp,chains,type,newVal,oldVal,0,comp);
	}

	function mergeExpNodes(expProps){
		var expNodes = [];
		for(var i=expProps.length;i--;){
			for(var j=expProps[i].expNodes.length;j--;){
				var expNode = expProps[i].expNodes[j];
				if(expNodes.indexOf(expNode) < 0)
					expNodes.push(expNode);
			}
		}
		return expNodes;
	}

	var sqbExp = /(^\[)|(,\[)/;
	function mergeExpProp(object,name,component,propChain,changeType,newVal,oldVal){
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

        //merge
        for(var i=matchs.length;i--;){
        	var prop = matchs[i];
        	prop.propChain = propChain;
        	prop.newVal = newVal;
        	prop.oldVal = oldVal;
        	prop.name = name;
        	prop.type = changeType;
        	prop.object = object;
        	expProps.push(prop);
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
	function findExpProp(object,name,component,propChain,changeType,newVal,oldVal,depth,topComp){
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
                prop = eval('impex._cs["'+component.__id+'"].data'+__propStr);
            }catch(e){}

            if(!Util.isUndefined(prop)){
            	__lastMatch = component;
                toRender = false;
            }else 
            if(__lastMatch && __lastMatch !== topComp)toRender = false;
		}
		if(toRender){
			mergeExpProp(object,name,component,propChain,changeType,newVal,oldVal);
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
 			findExpProp(object,name,subCtrlr,propChain,changeType,newVal,oldVal,depth+1,topComp);
 		}
	}

	function callWatchs(expProps){
		var invokedWatchs = [];
		for(var i=expProps.length;i--;){
			var prop = expProps[i];
			var propChain = prop.propChain;
			var newVal = prop.newVal;
			var oldVal = prop.oldVal;
			var name = prop.name;
			var object = prop.object;
			var changeType = prop.type;

			//callback watchs
			for(var j=prop.watchs.length;j--;){
				var watch = prop.watchs[j];

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
							LOGGER.debug('error on parse watch params',e);
							nv = null;
						}
					}
					watch.cbk && watch.cbk.call(watch.ctrlScope,object,name,changeType,nv,ov,propChain);
					invokedWatchs.push(watch);
				}
			}
		}
	}

	function callObserves(expProps){
		for(var i=expProps.length;i--;){
			var prop = expProps[i];
			for(var j=prop.attrObserveNodes.length;j--;){
				var aon = prop.attrObserveNodes[j];

				var rs = Renderer.evalExp(aon.directive,aon.expObj);
				aon.directive.observe(rs);
			}
		}
	}
}
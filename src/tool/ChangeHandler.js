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
	var changeMap = {};

	this.handle = function (change){
		if(combineChange){
			mergeChange(change);
		}else{
			changeQ = [];
			changeMap = {};
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
				var tmp = changeMap;
				for(var k in tmp){
					tmp[k].comp.__update(tmp[k].changes);
				}
			},20);
		}
	}
	
	function handlePath(newVal,oldVal,comp,type,name,object,pc){
        var chains = [];
        if(pc[0] instanceof Directive){
        	var index = pc[2] === undefined?name:pc[2];

	        comp = pc[0].subComponents[parseInt(index)];
	        chains.push(pc[1]);
	        if(Util.isUndefined(pc[2]) && comp instanceof Component){
	        	comp.state.__im__target && (comp.state.__im__target[pc[1]] = newVal);
	        }
        }else{
        	chains = pc.concat();
			if(!Util.isArray(object))
	        chains.push(name);
        }
        
        if(!comp)return;

        if(!changeMap[comp.__id]){
        	changeMap[comp.__id] = {
        		changes:[],
        		comp:comp
        	};
        }
        var c = new Change(name,newVal,oldVal,chains,type,object);
        changeMap[comp.__id].changes.push(c);

        mergeExpProp(comp,chains,c);
	}

	var sqbExp = /(^\[)|(,\[)/;
	function mergeExpProp(component,propChain,changeObj){
		var props = component.__expDataRoot.subProps;
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

        	changeObj.expProps.push(prop);
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

}
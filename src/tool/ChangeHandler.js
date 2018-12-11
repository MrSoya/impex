/**
 * 变更处理器，处理所有变量变更，并触发渲染
 */

var ChangeHandler = new function() {

	function mergeChange(change){
		for(var i=changeQ.length;i--;){
			var c = changeQ[i];
			if(!c.store && c.object.__im__oid === change.object.__im__oid && c.name === change.name)break;
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
					var comp = change.comp;

					var newVal = change.newVal;
					var oldVal = change.oldVal;
					var pc = change.pc;
					var type = change.type;
					var name = change.name;
					var object = change.object;
					
					handlePath(newVal,oldVal,comp,type,name,object,pc,change.action);
				});//end for
				var tmp = changeMap;
				for(var k in tmp){
					if(tmp[k].comp instanceof Component){
						updateComponent(tmp[k].comp,tmp[k].change);
					}else{
						tmp[k].comp.__update(tmp[k].change);
					}					
				}
			},20);
		}
	}
	
	function handlePath(newVal,oldVal,comp,type,name,object,pc,action){
        var chains = [];
    	chains = pc.concat();
		if(!isArray(object))
        	chains.push(name);
        
        if(!comp)return;
        var cid = comp.id;

        if(!changeMap[cid]){
        	changeMap[cid] = {
        		change:{},
        		comp:comp
        	};
        }
        var c = new Change(name,newVal,oldVal,chains,type,object);
        if(action){
        	changeMap[cid].change[name] = [c,action];
        }else{
        	changeMap[cid].change[name] = c;
        }
        
	}
}

/**
 * 变更信息
 */
function Change(name,newVal,oldVal,path,type,object){
	this.name = name;
	this.newVal = newVal;
	this.oldVal = oldVal;
	this.path = path;
	this.type = type;
	this.object = object;
}
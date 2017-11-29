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
					var comp = change.comp;

					var newVal = change.newVal;
					var oldVal = change.oldVal;
					var pc = change.pc;
					var type = change.type;
					var name = change.name;
					var object = change.object;
					
					handlePath(newVal,oldVal,comp,type,name,object,pc);
				});//end for
				var tmp = changeMap;
				for(var k in tmp){
					updateComponent(tmp[k].comp,tmp[k].changes);
				}
			},20);
		}
	}
	
	function handlePath(newVal,oldVal,comp,type,name,object,pc){
        var chains = [];
    	chains = pc.concat();
		if(!isArray(object))
        	chains.push(name);
        
        if(!comp)return;

        if(!changeMap[comp._uid]){
        	changeMap[comp._uid] = {
        		changes:[],
        		comp:comp
        	};
        }
        var c = new Change(name,newVal,oldVal,chains,type,object);
        changeMap[comp._uid].changes.push(c);
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
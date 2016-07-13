	function setArray(ary,index,value){
		if(isNaN(index))return;

		ary[index>>0] = value;
	}
	function delArray(ary,index){
		if(isNaN(index))return;

		ary.splice(index,1);
	}
	function observeData(handler,propChains,data,component){
		if(data && data.__im__propChain)return data;

		var t = data instanceof Array?[]:{};
		for(var k in data){
			var o = data[k];
			if(typeof o === 'object'){
				var pcs = propChains.concat();
				pcs.push(k);
				var tmp = observeData(handler,pcs,o,component);
				t[k] = tmp;
			}else{
				t[k] = o;
			}
		}
		Object.defineProperty(t,'__im__propChain',{enumerable: false,writable: false,value:propChains});
		Object.defineProperty(t,'__im__extPropChain',{enumerable: false,writable: true,value:[]});
		return new Proxy(t, handler);
	}

	var Observer = {
		observe:function(data,component){
			if(data && data.__im__propChain)return data;

			//build handler
			var handler = {
				comp:component,
			    // get: function(target, name){
			    //     return target[name];
			    // },
			    set: function(target,name,value) {
			    	var isAdd = !(name in target);

			    	var old = target[name];
			    	var v = value;
			    	if(old === v)return true;

			    	if(typeof v === 'object'){
			    		var pcs = target.__im__propChain.concat();
						pcs.push(name);
			    		v = observeData(this,pcs,v,this.comp);
			    	}
			    	if(target instanceof Array){
			    		setArray(target,name,v);
			    	}else{
				    	target[name] = v;
			    	}

			    	var path = target.__im__propChain;//.concat();
			    	var xpath = target.__im__extPropChain;

			    	var changeObj = {object:target,name:name,pc:path,xpc:xpath,oldVal:old,newVal:value,comp:this.comp,type:isAdd?'add':'update'};
			    	Builder.handleChange(changeObj);
			    	
			    	return true;
			    },
			    deleteProperty: function (target, name) {
			    	var old = target[name];

				    if(target instanceof Array){
			    		delArray(target,name);
			    	}else{
			    		delete target[name];
			    	}

				    var path = target.__im__propChain;//.concat();
			    	var xpath = target.__im__extPropChain;

				    var changeObj = {object:target,name:name,pc:path,xpc:xpath,oldVal:old,comp:this.comp,type:'delete'};
			    	Builder.handleChange(changeObj);

				    return true;
				}
			};

			return observeData(handler,[],data,component);
		}
	};
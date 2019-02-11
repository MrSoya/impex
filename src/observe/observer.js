/**
 * 兼容IE11的observer实现，包括
 * 	watcher
 *  组件参数依赖
 *  计算属性
 *  ...
 */
function observe(state,target) {
   	target.$state = defineProxy(state,null,target,true);
}
function defineProxy(state,pmonitor,target,isRoot) {
    var t = Array.isArray(state)?wrapArray([],target,pmonitor):{};
    for(var k in state){
        var v = state[k];
        var react = null;
        var monitor = null;

        //对象被重新赋值后出发
        if(pmonitor && pmonitor.value){
            var desc = Object.getOwnPropertyDescriptor(pmonitor.value,k);
            if(desc && desc.get){
                monitor = desc.get.__mm__;
            }
        }
        
        //monitor has existed
        var desc = Object.getOwnPropertyDescriptor(state,k);
        if(desc && desc.get){
            monitor = desc.get.__mm__;
        }
        if(!monitor){
            monitor = new Monitor();
        }
        if(isObject(v)){
            v = defineProxy(v,monitor,target,false);
        }
        proxy(k,v,t,target,isRoot,monitor);
    }
    return t;
}
function proxy(k,v,t,target,isRoot,monitor) {
    monitor.key = k;
    monitor.target = t;
    monitor.value = v;
    var getter = function() {
            //收集依赖
            monitor.collect();

            return monitor.value;
        };
    Object.defineProperty(getter,'__mm__',{value:monitor});
    var handler = {
        enumerable:true,
        configurable:true,
        get:getter,
        set:function(v) {
            if(v === monitor.value)return;
            
            if(isObject(v)){
                v = defineProxy(v,monitor,target,false);
                if (Array.isArray(v)) {
                    v = wrapArray(v,target,monitor);
                }
            }
            
            //触发更新
            monitor.notify(v,'update');
        }
    };
    
    Object.defineProperty(t,k,handler);
    if(isRoot){
        Object.defineProperty(target,k,handler);
    }
    return monitor;
}
var AP_PUSH = Array.prototype.push;
var AP_POP = Array.prototype.pop;
var AP_SHIFT = Array.prototype.shift;
var AP_UNSHIFT = Array.prototype.unshift;
var AP_SPLICE = Array.prototype.splice;
var AP_REVERSE = Array.prototype.reverse;
var AP_SORT = Array.prototype.sort;
function wrapArray(ary,component,monitor) {
    if(ary.push !== AP_PUSH)return ary;
    Object.defineProperties(ary,{
        'push':{
            value:function() {
                var bl = this.length;
                var nl = AP_PUSH.apply(this,arguments);
                if(nl > bl){
                    //proxy
                    var rv = defineProxy(this,monitor,component,false);
                    monitor.notify(rv,'add');
                }
                return nl;
            }
        },
        'pop':{
            value:function() {
                var bl = this.length;
                var rs = AP_POP.call(this);
                if(this.length < bl){
                    monitor.notify(this,'del');
                }
                return rs;
            }
        },
        'unshift':{
            value:function() {
                var bl = this.length;
                var nl = AP_UNSHIFT.apply(this,arguments);
                if(nl > bl){
                    //proxy
                    var rv = defineProxy(this,monitor,component,false);
                    monitor.notify(rv,'add');
                }
                return nl;
            }
        },
        'shift':{
            value:function() {
                var bl = this.length;
                var rs = AP_SHIFT.call(this);
                if(this.length < bl){
                    monitor.notify(this,'del');
                }
                return rs;
            }
        },
        'splice':{
            value:function() {
                var type = null;
                if(arguments[1]>-1){
                    type = 'del';
                }
                if(arguments.length>2){
                    type = type=='del'?'update':'add';
                }
                var bl = this.length;
                var ary = AP_SPLICE.apply(this,arguments);
                if(type != 'del'){
                    //proxy
                    var rv = defineProxy(this,monitor,component,false);
                    monitor.notify(this,type);
                }
                if((ary && ary.length>0) || bl != this.length){
                    monitor.notify(this,type);
                }
                return ary;
            }
        },
        'reverse':{
            value:function() {
                if(this.length<1)return this;

                AP_REVERSE.call(this);

                monitor.notify(this,'update');
                
                return this;
            }
        },
        'sort':{
            value:function(sortby) {
                if(this.length<1)return this;

                AP_SORT.call(this,sortby);

                monitor.notify(this,'update');

                return this;
            }
        },
    });

    return ary;
}
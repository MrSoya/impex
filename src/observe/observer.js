/**
 * 兼容IE11的observer实现，包括
 * 	watcher
 *  组件参数依赖
 *  计算属性
 *  ...
 */
function observe(target,comp) {
   	//遍历属性进行监控
    for(var k in target){
        var v = target[k];

        //已有monitor
        var desc = Object.getOwnPropertyDescriptor(target,k);
        if(desc && desc.get){
            continue;
        }
        var monitor = new Monitor(k,v,target);

        if(isObject(v)){//如果子属性是对象，递归代理
            defineProxy(v,monitor);
        }

        //进行监控
        var handler = proxy(monitor);
        Object.defineProperty(target,k,handler);
        Object.defineProperty(comp,k,handler);
    }
}
/**
 * 对一个对象进行属性代理，拥有能监控对象已有属性的变更能力
 * @param  {Object}  target 代理的目标对象，可以是数组或者对象
 * @return proxyObj
 */
function defineProxy(target,pmonitor){
    if(!isObject(target))return;
    //遍历属性进行监控
    for(var k in target){
        var v = target[k];

        //已有monitor
        var desc = Object.getOwnPropertyDescriptor(target,k);
        if(desc && desc.get){
            continue;
        }
        var monitor = new Monitor(k,v,target,pmonitor);

        if(isObject(v)){//如果子属性是对象，递归代理
            defineProxy(v,monitor);
        }

        //进行监控
        var handler = proxy(monitor);
        Object.defineProperty(target,k,handler);
    }
    if(Array.isArray(target)){
        wrapArray(target,pmonitor);
    }
}

function proxy(monitor){
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
                defineProxy(v,monitor);
            }
            
            //触发更新
            monitor.notify(v);
        }
    };
    return handler;
}

var AP_PUSH = Array.prototype.push;
var AP_POP = Array.prototype.pop;
var AP_SHIFT = Array.prototype.shift;
var AP_UNSHIFT = Array.prototype.unshift;
var AP_SPLICE = Array.prototype.splice;
var AP_REVERSE = Array.prototype.reverse;
var AP_SORT = Array.prototype.sort;
function wrapArray(ary,monitor) {
    if(ary.push !== AP_PUSH)return ary;
    Object.defineProperties(ary,{
        'push':{
            value:function() {
                var bl = this.length;
                var nl = AP_PUSH.apply(this,arguments);
                if(nl > bl){
                    //proxy
                    defineProxy(this,monitor);
                    monitor.notify(this,'add');
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
                    defineProxy(this,monitor);
                    monitor.notify(this,'add');
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
                    defineProxy(this,monitor);
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
}
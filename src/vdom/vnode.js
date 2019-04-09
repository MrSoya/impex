/**
 * 虚拟节点
 * 保存编译前和编译后的信息
 */
var vn_counter = 0;
var rn_counter = 0;
function RawNode(tag) {
    this.rid = rn_counter++;
    this.tag = tag;
    this.children;
    this.directives;//{name:{name,args,modifiers,exp,filters}
    this.attrs;
    this.txtQ;
    this.ref;
    this.events;
    this.class;
    this.style;
    this.slot;//slot="xx"
    this.isComp = false;
    this.slotMap;
    this.outerHTML;
    this.innerHTML;
}
RawNode.prototype = {
    getInnerHTML:function() {
        var r = new RegExp('<\s*\/\s*'+this.tag+'\s*>','img');
        var rs = this.innerHTML.trim();
        var match = r.exec(rs);
        if(match){
            return rs.substring(0,match.index);
        }
        return rs;
    },
    getOuterHTML:function (){
        return this.outerHTML+this.getInnerHTML()+'</'+this.tag+'>';
    }
}
function VNode(tag,rawNode,attrs,di,events,ref,cls,style){
    this.tag = tag;
    this.txt;
    this.children;
    this.dom;
    this.vid = vn_counter++;
    this.attrs = attrs;
    this.directives = di;
    this.events = events;
    this.ref = ref;
    this.class = cls;
    this.style = style;
    this._slots;
    this.scope;//组件
    //原始信息
    this.raw = rawNode;
}
VNode.prototype = {
    /**
     * 绑定事件到该节点
     * @param {String} type 事件类型
     * @param {Function} handler 事件处理函数
     * @param {Array} modifiers 修饰符数组
     */
    on:function(type,handler,modifiers){
        var evMap = EVENT_MAP[type];
        if(!evMap){
            evMap = EVENT_MAP[type] = {};
        }
        var vid = this.vid;
        function closure(e) {
            return EventFilter(vid,e);
        }
        evMap[this.vid] = [this,modifiers,handler,closure];

        this.dom.addEventListener(type,closure,true);
    },
    /**
     * 卸载事件
     * @param {String} [type] 事件类型。为空时，卸载所有事件
     */
    off:function(type){
        var evMap = EVENT_MAP[type];
        if(evMap && evMap[this.vid]){
            var fn = evMap[this.vid][3];
            evMap[this.vid] = null;
            this.dom.removeEventListener(type,fn,true);
        }else if(!type){
            for(var k in EVENT_MAP){
                evMap = EVENT_MAP[k];
                if(evMap && evMap[this.vid]){
                    var fn = evMap[this.vid][3];
                    evMap[this.vid] = null;
                    this.dom.removeEventListener(k,fn,true);
                }
            }
        }

    }
};
/**
 * 处理事件过滤，包括修饰符，返回值
 */
function EventFilter(vid,e) {
    var type = e.type;
    var evMap = EVENT_MAP[type];
    if(!evMap)return;
    var tmp = evMap[vid];
    if(!tmp)return;

    var vnode = tmp[0];
    var t = e.target;

    //处理前置修饰符
    var modifiers = tmp[1];
    if(modifiers && modifiers.length>0){
        //键盘事件
        if(type.indexOf('key')===0){
            var keys = modifiers.filter(function(mod) {
                switch(mod){
                    case EVENT_MODIFIER_NATIVE:
                    case EVENT_MODIFIER_STOP:
                    case EVENT_MODIFIER_PREVENT:
                    case EVENT_MODIFIER_SELF:
                        return false;
                }
                return true;
            });

            if(keys[0] && e.key.toLowerCase() != keys[0])return;
        }
        if(modifiers.indexOf(EVENT_MODIFIER_SELF)>-1){
            if(vnode.dom !== t)return;
        }
    }
    
    var fn = tmp[2];
    var rs = fn.call(vnode.scope,e,vnode);

    //后置修饰符
    if(modifiers && modifiers.length>0){
        if(modifiers.indexOf(EVENT_MODIFIER_STOP)>-1){
            e.stopPropagation();
        }
        if(modifiers.indexOf(EVENT_MODIFIER_PREVENT)>-1){
            e.preventDefault();
        }
    }

    return rs;
}
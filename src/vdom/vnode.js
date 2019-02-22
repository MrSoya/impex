/**
 * 虚拟节点
 * 保存编译前和编译后的信息
 */
var vn_counter = 0;
var rn_counter = 0;
function RawNode(tag) {
    this.rid = rn_counter++;
    this.tag = tag;
    this.children = [];
    this.directives = {};//{name:[dName,value,{dName,dArgsAry,dModifiers},{vExp,vFilterAry}]
    this.attributes = {};
    this.txtQ;
    this.slotMap = {};
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

function VNode(tag,rawNode){
    this.tag = tag;
    this.txt;
    this.children = [];
    this.dom;
    this.vid = vn_counter++;
    //和真实DOM保持一致的当前节点属性，
    //不仅包含原始属性，也可能包含通过指令或者接口调用而产生的其他属性
    this.attributes;
    //[name,value,{dName,dArgsAry,dModifiers},{vExp,vFilterAry}]
    this.directives = [];
    this._hasEvent;
    this._slots;
    this._comp;//组件
    this._forScopeQ;
    //原始信息
    this.raw = rawNode;
}
VNode.prototype = {
    /**
     * 绑定事件到该节点
     * @param {String} type 事件类型
     * @param {String|Function} exp 表达式或回调函数
     * @param {Array} modifiers 修饰符数组
     */
    on:function(type,exp,modifiers){
        var evMap = EVENT_MAP[type];
        if(!evMap){
            evMap = EVENT_MAP[type] = {};
        }
        var fn = false;
        if(isFunction(exp)){
            fn = true;
        }
        if(fn){
            evMap[this.vid] = [this,modifiers,exp,this._cid,fn];
        }else{
            var declare = this.getAttribute('var');
            if(declare){
                var list = declare.replace(/^{|}$/mg,'').split(',');
                var str = '';
                list.forEach(function(de) {
                    var pair = de.split(':');
                    str += 'var '+ pair[0] +'='+pair[1]+';';
                });
                declare = str;
            }
            var forScopeStart = '',forScopeEnd = '';
            if(this._forScopeQ)
                for(var i=0;i<this._forScopeQ.length;i++){
                    forScopeStart += 'with(arguments['+(3/* event.js line 47 */+i)+']){';
                    forScopeEnd += '}';
                }
            evMap[this.vid] = [this,modifiers,new Function('comp,$event,$vnode','with(comp){'+forScopeStart+declare+";"+exp+forScopeEnd+'}'),this._cid];
        }

        this._hasEvent = true;
    },
    /**
     * 卸载事件
     * @param {String} [type] 事件类型。为空时，卸载所有事件
     */
    off:function(type){
        var evMap = EVENT_MAP[type];
        if(evMap){
            evMap[this.vid] = null;
        }else if(!type){
            for(var k in EVENT_MAP){
                evMap = EVENT_MAP[k];
                if(evMap)evMap[this.vid] = null;
            }
        }
    },
    setAttribute:function(k,v){
        this.attributes[k] = v;
        return this;
    },
    getAttribute:function(k){
        return this.attributes[k];
    },
    removeAttribute:function(k) {
        this.attributes[k] = null;
        delete this.attributes[k];
    }
};
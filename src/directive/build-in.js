/**
 * 内建指令
 */
///////////////////// 视图控制指令 /////////////////////
/**
 * 内联样式指令
 * <br/>使用方式：
 * <div x-style="{'font-size': valExp}" >...</div>
 * <div x-style="{'fontSize': valExp}" >...</div>
 * <div x-style="'color:red;font-size:20px;'" >...</div>
 * <div x-style="obj" >...</div>
 */
impex.directive('style',{
    appended:function(el,data,vnode){
        var styleMap = data.value;
        if(isString(styleMap)){
            var rs = {};
            var tmp = styleMap.split(';');
            for(var i=tmp.length;i--;){
                if(!tmp[i])continue;
                var pair = tmp[i].split(':');
                rs[pair[0]] = pair[1];
            }
            styleMap = rs;
        }
        //转换为css key
        var addStyles = {};
        for(var k in styleMap){
            var sk = k.trim().replace(/[A-Z]/mg,function(a){return '-'+a.toLowerCase()});
            addStyles[sk] = styleMap[k];
        }
        var lastStyles = vnode._lastStyleMap||{};
        var styleMap = {};//当前dom样式
        el.style.cssText.split(';').forEach(function(kv) {
            if(!kv)return;

            var pair = kv.split(':');
            var k = pair[0].trim();
            if(!lastStyles[k])//删除上一次样式
                styleMap[k] = pair[1];
        });
        //增加
        for(var k in addStyles){
            styleMap[k] = addStyles[k];
        }
        
        vnode._lastStyleAry = addStyles;
        el.setAttribute('style',this.getCssText(styleMap));
    },
    update:function(el,data,vnode) {
        this.appended(el,data,vnode);
    },
    unbind:function(el,data,vnode){
        if(!el.style.cssText)return;
        //删除当前dom中的对应样式
        var lastStyles = vnode._lastStyleMap;
        if(!lastStyles)return;
        var styleMap = {};//当前dom样式
        el.style.cssText.split(';').forEach(function(kv) {
            if(!kv)return;

            var pair = kv.split(':');
            var k = pair[0].trim();
            if(!lastStyles[k])//删除上一次样式
                styleMap[k] = pair[1];
        });
        el.setAttribute('style',this.getCssText(styleMap));
    },
    getCssText:function(styleMap) {
        var style = '';
        for(var k in styleMap){
            var val = styleMap[k];
            style += ';'+k+':'+val;
            // if(val.indexOf('!important')){
            //     val = val.replace(/!important\s*;?$/,'');
            //     n = n.replace(/[A-Z]/mg,function(a){return '-'+a.toLowerCase()});
            //     style.setProperty(n, v, "important");
            // }else{
            //     style[n] = val;
            // }
        }
        return style;
    }
})
/**
 * 样式指令，会对dom当前的className进行修改
 * 更新时，会对比新的指令值，移除不存在的样式，添加新样式
 * 卸载时，会移除所有指令样式
 * <br/>使用方式：
 * <div x-class="'cls1 cls2 cls3 ...'" >...</div>
 * <div x-class="['cls1','cls2','cls3']" >...</div>
 * <div x-class="{cls1:boolExp,cls2:boolExp,cls3:boolExp}" >...</div>
 */
.directive('class',{
    appended:function(el,data,vnode){
        var v = data.value;
        var cls = el.className;//dom已有样式
        var clsAry = cls.trim().replace(/\s+/mg,' ').split(' ');
        var addCls = this.getClassAry(data);
        var lastCls = vnode._lastClassAry;
        //删除上一次样式
        if(lastCls){
            lastCls.forEach(function(c) {
                if(!c)return;
                var i = clsAry.indexOf(c.trim());
                if(i>-1){
                    clsAry.splice(i,1);
                }
            });
        }
        
        //增加
        addCls.forEach(function(c) {
            if(c && clsAry.indexOf(c.trim())<0){
                clsAry.push(c);
            }
        });
        
        vnode._lastClassAry = addCls;
        el.setAttribute('class',clsAry.join(' '));
    },
    update:function(el,data,vnode) {
        this.appended(el,data,vnode);
    },
    unbind:function(el,data,vnode) {
        if(!el.className)return;
        //删除当前dom中的对应样式
        var delCls = vnode._lastClassAry;
        var clsAry = el.className.replace(/\s+/mg,' ').split(' ');
        delCls.forEach(function(cls) {
            if(!cls)return;
            var i = clsAry.indexOf(cls);
            if(i>-1){
                clsAry.splice(i,1);
            }
        });
        el.setAttribute('class',clsAry.join(' '));
    },
    getClassAry:function(data) {
        var v = data.value;
        var addCls = null;
        if(isString(v)){
            addCls = v.split(' ');
        }else if(isArray(v)){
            addCls = v;
        }else{
            addCls = [];
            for(var k in v){
                var val = v[k];
                if(val)
                    addCls.push(k);
            }
        }
        return addCls;
    }
})
/**
 * 绑定视图事件，以参数指定事件类型，用于减少单一事件指令书写
 * <br/>使用方式1：<img x-on:load:mousedown:touchstart="hi()" x-on:dblclick="hello()">
 * <br/>使用方式2：<img :load:mousedown:touchstart="hi()" :dblclick="hello()">
 */
.directive('on',{
    bind:function(el,data,vnode){
        var args = data.args;
        for(var i=args.length;i--;){
            vnode.on(args[i],data.value||data.exp,data.modifiers);
        }
    },
    update:function(el,data,vnode) {
        this.bind(el,data,vnode);
    },
    unbind:function(el,data,vnode){
        var args = data.args;
        for(var i=args.length;i--;){
            vnode.off(args[i]);
        }
    }
})
/**
 * 绑定视图属性，并用表达式的值设置属性
 * <br/>使用方式：<img x-bind:src="exp">
 * <br/>快捷方式：<img .src="exp">
 */
.directive('bind',{
    bind:function(el,data,vnode) {
        var args = data.args;
        for(var i=args.length;i--;){
            var p = args[i];

            switch(p){
                case 'style':
                    DIRECT_MAP[p].update(el,data,vnode);
                    break;
                case 'class':
                    DIRECT_MAP[p].update(el,data,vnode);
                    break;
                default:
                    el.setAttribute(p,data.value);
                    if(el.tagName=='INPUT' && p=='value'){
                        el.value = data.value;
                    }
            }//end switch
        }//end for
    },
    update:function(el,data,vnode) {
        this.bind(el,data,vnode);
    },
    unbind:function(el,data,vnode) {
        var args = data.args;
        for(var i=args.length;i--;){
            var p = args[i];
            switch(p){
                case 'style':
                    DIRECT_MAP[p].unbind(el,data,vnode);
                    break;
                case 'class':
                    DIRECT_MAP[p].unbind(el,data,vnode);
                    break;
                default:
                    el.removeAttribute(p);
            }//end switch
        }//end for
    }
})
/**
 * 控制视图显示指令，根据表达式计算结果控制
 * <br/>使用方式：<div x-show="exp"></div>
 */
.directive('show',{
    bind:function(el,data){
        var style = el.getAttribute('style')||'';
        if(data.value){
            style = style.replace(/;display\s*:\s*none\s*;?/,'');
        }else{
            style = style.replace(/;display:none;/,'') + ';display:none;';
        }
        
        el.setAttribute('style',style);
    },
    update:function(el,data,vnode) {
        this.bind(el,data);
    },
    unbind:function(el,data,vnode) {
        var style = el.getAttribute('style');
        if(!style)return;
        style = style.replace(/;display\s*:\s*none\s*;?/,'');
        el.setAttribute('style',style);
    }
})
/**
 * 隐藏视图显示指令，用于屏蔽指定渲染模块
 * <br/>使用方式：
 * <style>
 *     [x-cloak]{
            display: none;
        }
 * </style>
 * <div x-cloak></div>
 */
.directive('cloak',{})
///////////////////// 模型控制指令 /////////////////////
/**
 * 绑定模型属性，当控件修改值后，模型值也会修改
 * <br/>使用方式：<input x-model="model.prop">
 */
.directive('model',{
    bind:function(el,data,vnode){
        vnode._exp = data.exp;
        switch(vnode.tag){
            case 'select':
                vnode.on('change',this.handleChange);
                break;
            case 'input':
                var type = vnode.attributes.type;
                if(type == 'radio' || type == 'checkbox'){
                    vnode.on('change',this.handleChange);
                    break;
                }
            default:
                vnode.on('input',handleInput);
        }
    },
    handleChange:function(e,vnode){
        var el = e.target;
        var tag = el.tagName.toLowerCase();
        var val = el.value;
        switch(tag){
            case 'textarea':
            case 'input':
                var type = el.getAttribute('type');
                switch(type){
                    case 'radio':
                        handleInput(e,vnode,this);
                        break;
                    case 'checkbox':
                        changeModelCheck(e,vnode,this);
                        break;
                }
                break;
            case 'select':
                var mul = el.getAttribute('multiple');
                if(mul !== null){
                    var parts = [];
                    for(var i=el.options.length;i--;){
                        var opt = el.options[i];
                        if(opt.selected){
                            parts.push(opt.value);
                        }
                    }
                    setModel(vnode,parts,this);
                }else{
                    handleInput(e,vnode,this);
                }
                break;
        }
    }
});

function handleInput(e,vnode,comp){
    var v = (e.target || e.srcElement).value;
    var toNum = vnode.getAttribute('number');
    if(!isUndefined(toNum)){
        v = parseFloat(v);
    }
    var debounce = vnode.getAttribute('debounce');
    if(debounce){
        if(vnode.debounceTimer){
            clearTimeout(vnode.debounceTimer);
            vnode.debounceTimer = null;
        }
        var that = this;
        vnode.debounceTimer = setTimeout(function(){
            clearTimeout(vnode.debounceTimer);
            vnode.debounceTimer = null;
            
            setModel(vnode,v,that || comp);
        },debounce);
    }else{
        setModel(vnode,v,this || comp);
    }
}
function changeModelCheck(e,vnode,comp){
    var t = e.target || e.srcElement;
    var val = t.value;
    var str = 'with(scope){return '+vnode._exp+'}';
    var fn = new Function('scope',str);
    var parts = null;
    if(!this){
        parts = fn(comp);
    }else{
        parts = fn(this);
    }
    if(isArray(parts)){
        parts = parts.concat();
    }else{
        parts = [parts];
    }
    if(t.checked){
        parts.push(val);
    }else{
        var i = parts.indexOf(val);
        if(i > -1){
            parts.splice(i,1);
        }
    }
    setModel(vnode,parts,comp);
}
function setModel(vnode,value,comp){
    var fn = new Function('comp','v','comp.'+vnode._exp+'= v;');
    fn(comp,value);
}
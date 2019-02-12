/**
 * for DOM event delegation，support mouseEvent
 */
function dispatch(type,e) {
    var p = e.target;
    var canceled = false;
    do{
        var uid = p._vid;
        if(uid === undefined)continue;
        var evMap = EVENT_MAP[type];
        if(!evMap)continue;
        var tmp = evMap[uid];
        if(!tmp)continue;

        var vnode = tmp[0];

        if(type == 'mouseleave'){
            var t = e.target;
            if(!contains(vnode.dom,t))return;
            var toElement = e.toElement || e.relatedTarget;
            if(contains(vnode.dom,toElement))return;
            
            var i = vnodes_mouseEntered.indexOf(vnode);
            if(i>-1)vnodes_mouseEntered.splice(i,1);
        }
        if(type == 'mouseenter'){
            var t = e.target;
            var fromElement = e.relatedTarget;
            if(contains(vnode.dom,t) && vnode.dom != t && vnodes_mouseEntered.indexOf(vnode)>-1)return;
            if(fromElement && contains(vnode.dom,fromElement))return;
            vnodes_mouseEntered.push(vnode);
        }

        var filter = tmp[1];

        if(type.indexOf('key')===0 && filter){
            if(e.key.toLowerCase() != filter)continue;
        }

        var fn = tmp[2];
        var cid = tmp[3];
        var isFn = tmp[4];
        var comp = impex._cs[cid];
        if(isFn){
            fn.call(comp,e,vnode);
        }else{
            var args = [comp,e,vnode];
            if(vnode._forScopeQ)
                for(var i=0;i<vnode._forScopeQ.length;i++){
                    args.push(vnode._forScopeQ[i]);
                }
            fn.apply(comp,args);
        }

        canceled = e.cancelBubble;
        
    }while((p = p.parentNode) && p.tagName != 'BODY' && !canceled);
}
function contains(a,b){
    if(a.contains){
        return a.contains(b);
    }
    do{
        if(a == b)return true;
        b = b.parentNode;
    }while(b && b.tagName != 'BODY');
    return false;
}
//scope vars
var vnodes_mouseEntered = [];

///////////////////// 鼠标事件分派器 /////////////////////
document.addEventListener('click',doClick,true);
document.addEventListener('dblclick',doDblClick,true);
document.addEventListener('mousedown',doMousedown,true);
document.addEventListener('mousemove',doMousemove,true);
document.addEventListener('mouseup',doMouseup,true);

document.addEventListener('mouseout',doMouseout,true);
document.addEventListener('mouseover',doMouseover,true);

function doClick(e) {
    dispatch('click',e);
}

function doDblClick(e) {
    dispatch('dblclick',e);
}
    
function doMousedown(e){
    dispatch('mousedown',e);
}
function doMousemove(e){
    dispatch('mousemove',e);
}
function doMouseup(e){
    dispatch('mouseup',e);
}
function doMouseout(e){
    dispatch('mouseout',e);
    dispatch('mouseleave',e);

    //check entered
    var t = e.target;
    var toDel = [];
    vnodes_mouseEntered.forEach(function(vnode) {
        if(!contains(vnode.dom,t))return;
        var toElement = e.toElement || e.relatedTarget;
        if(contains(vnode.dom,toElement))return;
        
        toDel.push(vnode);
    });
    toDel.forEach(function(vnode) {
        var i = vnodes_mouseEntered.indexOf(vnode);
        vnodes_mouseEntered.splice(i,1);
    });
}
function doMouseover(e){
    dispatch('mouseover',e);
    dispatch('mouseenter',e);
}

//model events
document.addEventListener('input',function(e){
    dispatch('input',e);
},true);
document.addEventListener('change',function(e){
    dispatch('change',e);
},true);

//keyboard events
document.addEventListener('keydown',function(e){
    dispatch('keydown',e);
},true);
document.addEventListener('keypress',function(e){
    dispatch('keypress',e);
},true);
document.addEventListener('keyup',function(e){
    dispatch('keyup',e);
},true);

//focus events
document.addEventListener('focus',function(e){
    dispatch('focus',e);
},true);
document.addEventListener('blur',function(e){
    dispatch('blur',e);
},true);

//mousewheel
var mousewheel = self.onwheel==null?'wheel':'mousewheel';
document.addEventListener(mousewheel,function(e){
    dispatch('wheel',e);
},true);

//scroll
document.addEventListener('scroll',function(e){
    dispatch('scroll',e);
},true);
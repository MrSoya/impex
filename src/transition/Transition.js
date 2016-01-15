/**
 * @classdesc 过渡类。用于提供CSS3动画转换或js动画过渡回调接口
 * @class 
 */
var TRANSITIONS = {
    "transition"      : "transitionend",
    "OTransition"     : "oTransitionEnd",
    "MozTransition"   : "mozTransitionend",
    "WebkitTransition": "webkitTransitionEnd"
}
var TESTNODE;
function Transition (type,component,hook) {
    if(!TESTNODE){
        TESTNODE = document.createElement('div');
        document.body.appendChild(TESTNODE);
    }

    if(!hook || hook.css !== false){
        TESTNODE.className = (type + '-transition');
        TESTNODE.style.left = '-9999px';
        var cs = window.getComputedStyle(TESTNODE,null);
        var durations = cs['transition-duration'].split(',');
        var delay = cs['transition-delay'].split(',');
        var max = -1;
        for(var i=durations.length;i--;){
            var du = parseFloat(durations[i]);
            var de = parseFloat(delay[i]);
            if(du+de > max)max = du+de;
        }

        if(max > 0){
            var v = component.$view;
            var expNodes = component.$__expNodes;
            if(expNodes.length<1 && component.$parent){
                expNodes = component.$parent.$__expNodes;
            }
            for(var i=expNodes.length;i--;){
                var expNode = expNodes[i];
                if(expNode.attrName === 'class'){
                    expNode.origin += ' '+ type + '-transition';
                }
            }
            v.addClass(type + '-transition');
            this.$__longest = max;

            var te = null;
            for (var t in TRANSITIONS){
                if (v.el.style[t] !== undefined){
                    te = TRANSITIONS[t];
                    break;
                }
            }
            v.el.addEventListener(te,this.__done.bind(this),false);

            this.$__css = true;
        }
    }else{
    	this.$__css = false;
    }

    this.$__comp = component;
    this.$__view = v;
    this.$__hook = hook || {};
    this.$__type = type;
    
}
Transition.prototype = {
	enter:function(){
		this.$__start = 'enter';

		if(this.$__css)
        	this.$__view.addClass(this.$__type + '-enter');
        //exec...
        if(this.$__comp.enter){
        	this.$__comp.enter();
        }
        if(this.$__hook.enter){
        	this.$__hook.enter.call(this.$__comp,this.__enterDone.bind(this));
        }
        if(this.$__css){
        	this.$__view.el.offsetHeight;
        	this.$__view.removeClass(this.$__type + '-enter');
        }
	},
	__enterDone:function(){
		
	},
	leave:function(){
		this.$__start = 'leave';

		if(this.$__css)
        	this.$__view.addClass(this.$__type + '-leave');
        //exec...
        if(this.$__hook.leave){
        	this.__leaveDone.$__trans = this;
        	this.$__hook.leave.call(this.$__comp,this.__leaveDone.bind(this));
        }
	},
	__leaveDone:function(){
		if(this.$__comp.leave){
        	this.$__comp.leave();
        }
	},
	__done:function(e){
		if(e.elapsedTime < this.$__longest)return;
        if(!this.$__start)return;

        switch(this.$__start){
        	case 'enter':
        		this.__enterDone();
        		break;
        	case 'leave':
        		this.__leaveDone();
        		break;
        }

        this.$__start = '';
        this.$__view.removeClass(this.$__type + '-leave');
	}
};
/**
 * 过渡工厂
 */

var TransitionFactory = {
	hooks:{},
	register:function(type,hook){
		this.hooks[type] = hook;
	},
	transitions:{},
	get:function(type,component){
		var tmp = new Transition(type,component,this.hooks[type]);
		
		return tmp;
	}
}

/**
 * impex日志系统
 */
impex.console = new function(){
	this.warn = function(txt){
        console.warn('impex warn :: ' + txt);
    }
    this.error = function(txt){
        console.error('impex error :: ' + txt);
    }
    this.debug = function(txt){
		if(!DEBUG)return;
        console.debug('impex debug :: ' + txt);
    }
}

//polyfill
self.console = self.console||new function(){
    this.log = function(){}
    this.info = function(){}
    this.debug = function(){}
    this.error = function(){}
    this.warn = function(){}
}
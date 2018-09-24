/**
 * loadable提供一个基于ajax的组件加载接口，可以简化组件加载写法
 *
 * 兼容性：IE 9+
 */
!function(g){
	/**
	 * 加载指定url
	 * @param  {[type]} url [description]
	 * @return {Function}   返回一个符合promise接口的回调函数
	 */
	g.loadable = function(url) {
		// var fn = new Function('resolve','reject','ajax("'+url+'",resolve,reject)');
		return function(resolve,reject) {
			ajax(url,resolve,reject);
		};
	}

	function ajax(url,resolve,reject) {
		var xhr = new XMLHttpRequest();
        xhr.open('get',url,true);
        xhr.onerror = reject;
        xhr.__resolve = resolve;
        if(xhr.onload === null){
            xhr.onload = onload;
        }else{
            xhr.onreadystatechange = onload;
        }
        xhr.url = url;
        xhr.send(null);
	}

	function onload(){
        if(this.status===0 || //local
        ((this.status >= 200 && this.status <300) || this.status === 304) ){
            var txt = this.responseText;
            this.__resolve(txt);
        }
    }

}(window);

impex.directive('ignore',{
    $final:true
});

var activedNode;
window.addEventListener('load',function(){
	var items = document.getElementById('nav-items');
	for(var i=items.children.length;i--;){
		if(items.children[i].className.indexOf('actived') > -1){
			activedNode = items.children[i];
			break;
		}
	}
	moveIndicator(activedNode);
},false);

var sub;
function moveIndicator(node){
	node = node || activedNode;
	var w = node.offsetWidth;
	var l = node.offsetLeft;
	var indicator = document.getElementById('indicator');
	indicator.style.width = w+'px';
	indicator.style.left = l+'px';

	var tmp = $('.dropdown-menu',node);
	if(tmp[0]){
		tmp.css('display','block');
		sub = tmp;
	}else{
		sub && sub.css('display','none');
	}
}

var show = false;
function toggleMenu(e){
	show = !show;
	$('#sideNav').toggleClass('show');

	e.stopPropagation();
}

document.addEventListener('touchstart',function(e){
	var sideNav = $('#sideNav');
	if(!sideNav[0].contains(e.target) && show){
		show = false;
		sideNav.removeClass('show');
	}
},false)
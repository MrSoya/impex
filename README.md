# impex.js

> 一个基于数据驱动的组件式web开发引擎

## Website
[http://impexjs.org/](http://impexjs.org/)

## Demo

```html
<div id="entry">
    {{ 'hello ' + title => cap}}
    <x-subtitle>
        {{version}}
    </x-subtitle>
</div>
<script>
	//过滤器
    impex.filter('cap',{
        to:function(){
            var cap = this.value[0].toUpperCase();
            return cap + this.value.substr(1);
        }
    });
    //组件
    impex.component('x-subtitle',{
        template:"<sub>{{=CONTENT}}</sub>"
    });

    //渲染
    impex.render(document.getElementById('entry'),{
        data:{
            title:'impex',
            version:impex.version.toString()
        }
    });

</script>
```

## 兼容性
* IE9+
* FF38+
* chrome43+
* safari8+
* opera31+
* android4.0+
* IOS7.1+

## Local Examples

```
1. npm install http-server -g
2. http-server ./examples/ -p30760 -o
```

## License

Impex基于 [MIT](http://opensource.org/licenses/MIT) 协议发布。请查阅LICENSE文件

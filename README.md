# impex.js

> 一个基于数据驱动的组件式web开发引擎

## website
[http://mrsoya.github.io/impex/](http://mrsoya.github.io/impex/)

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
            var cap = this.$value[0].toUpperCase();
            return cap + this.$value.substr(1);
        }
    });
    //组件
    impex.component('x-subtitle',{
        $template:"<sub>{{=CONTENT}}</sub>"
    });

    //渲染
    impex.render(document.getElementById('entry'),new function(){
        this.title = 'impex';
        this.version = impex.version.toString();
    });

</script>
```

## 兼容性
* IE8(with impex.ext.ie8)
* IE9+
* FF38+
* chrome43+
* safari8+
* opera31+
* android4.0+
* IOS7.1+

## License

Impex基于 [MIT](http://opensource.org/licenses/MIT) 协议发布。请查阅LICENSE文件

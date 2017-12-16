import sublime
import sublime_plugin

mpx_all_directives = [
  ["x-if","x-if=\"${1:exp}\""],
  ["x-for","x-for=\"${1:ds} as ${2:item}\""],
  ["x-for\tto","x-for=\"${1:begin} to ${2:end} as ${3:i}\""],
  ["x-html","x-html=\"${1:exp}\""],
  ["x-class","x-class=\"${1:exp}\""],
  ["x-style","x-style=\"${1:exp}\""],
  ["x-bind\tshortcut",".$1=\"${2:exp}\""],
  ["x-on\tshortcut",":$1=\"${2:exp}\""],
  ["x-show","x-show=\"${1:exp}\""],
  ["x-model","x-model=\"${1:exp}\""],
]

mpx_custom_directives = [
  ["x-if","x-if=\"${1:exp}\""],
  ["x-for","x-for=\"${1:ds} as ${2:item}\""]
]

class ImpexAutocomplete(sublime_plugin.EventListener):
    def on_query_completions(self, view, prefix, locations):
        global mpx_all_directives,  mpx_custom_directives
        if view.match_selector(locations[0], 'text.html.basic meta.tag.block.any.html punctuation.definition.tag.end.html'):
            return mpx_all_directives
        if view.match_selector(locations[0], 'text.html.basic meta.tag.custom.html'):
            return mpx_custom_directives
        return []


class NewImpexTemplateCommand(sublime_plugin.TextCommand):
    def run(self, edit):
      window = sublime.active_window()
      newView = window.new_file()
      # syntax = self.view.settings().get('syntax')
      # print(syntax)
      newView.set_syntax_file("Packages/HTML/HTML.sublime-syntax")
      newView.insert(edit, 0, 
      "<!-- view -->\n<template>\n\t<style>\n\t\t/*scoped css*/\n\t</style>\n\n\t<!-- single node root -->\n\n</template>\n\n<!-- model -->\n<script>\n\tcomponent = {\n\t\tstate:{},\n\t\tonCompile:function(vnode){};\n\t}\n</script>")
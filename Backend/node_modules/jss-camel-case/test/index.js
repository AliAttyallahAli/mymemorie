'use strict'

QUnit.module('Camel Case plugin', {
    setup: function () {
        jss.use(jssCamelCase)
    },
    teardown: function () {
        jss.plugins.registry = []
    }
})

test('camel cased properties', function () {
    var ss = jss.createStyleSheet({
        a: {
            fontSize: '20px',
            zIndex: 1,
            lineHeight: 1.2
        }
    }, {named: false})
    equal(ss.toString(), 'a {\n  font-size: 20px;\n  z-index: 1;\n  line-height: 1.2;\n}')
})

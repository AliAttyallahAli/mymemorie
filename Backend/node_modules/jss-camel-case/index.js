'use strict'

var regExp = /([A-Z])/g

/**
 * Allow camel cased property names by converting them back to dasherized.
 *
 * @param {Rule} rule
 * @api public
 */
module.exports = function (rule) {
    var style = rule.style

    if (!style) return

    rule.style = {}

    for (var prop in style) {
        var value = style[prop]
        prop = prop
            .replace(regExp, '-$1')
            .toLowerCase()
        rule.style[prop] = value
    }
}

## Allows to write camel cased rule properties in JSS

Internally it converts everything back to dash separated names.

Take a look at [examples](http://jsstyles.github.io/jss-camel-case/examples/index.html) directory.


```javascript
exports.styles = {
    button: {
        fontSize: '20px',
        zIndex: 1,
        lineHeight: 1.2
    }
}
```
```css
button {
    font-size: 20px;
    z-index: 1;
    line-height: 1.2;
}
```

## Register plugin

```javascript
var jss = require('jss')
var cc = require('jss-camel-case')
jss.use(cc)
```

## Run tests

### Locally
```bash
npm i
open test/local.html
```
### From github

[Tests](https://jsstyles.github.com/jss-camel-case/test)

## License

MIT

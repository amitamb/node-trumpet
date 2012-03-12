var sax = require('sax');
var select = require('./lib/select');

module.exports = function (fn) {
    var parser = sax.parser(false);
    var stream = select(parser);
    
    function write (buf) {
        stream.emit('data', buf);
    }
    
    function makeNode (type, src, tag) {
        return {
            type : type,
            source : src,
            parser : parser,
            write : write,
            name : tag && tag.name,
            attributes  : tag && tag.attributes,
        };
    }
    
    var buffered = '';
    var pos = 0;
    var update = function (type, tag) {
        if (type === 'text') {
            var len = parser.startTagPosition - pos - 1;
        }
        else {
            var len = parser.position - parser.startTagPosition + 1;
        }
        pos = parser.position;
        
        var src = buffered.slice(0, len);
        buffered = buffered.slice(len);
        
        if (fn) fn(makeNode(type, src, tag))
        stream.raw(src);
        return src;
    };
    
    stream.write = function (buf) {
        var s = buf.toString();
        buffered += s;
        parser.write(buf.toString());
    };
    
    stream.end = function (buf) {
        if (buf !== undefined) stream.write(buf);
        
        if (pos < parser.position) {
            var s = buffered.slice(0, parser.position - pos);
            if (fn) fn(makeNode('text', s));
            stream.raw(s);
        }
        stream.emit('end');
    };
    
    parser.onopentag = function (tag) {
        stream.pre('open', tag);
        update('open', tag);
        stream.post('open', tag);
    };
    
    parser.onclosetag = function (name) {
        stream.pre('close', name);
        update('close');
        stream.post('close', name);
    };
    
    parser.ontext = function (text) {
        stream.pre('text', text);
        update('text');
        stream.post('text', text);
    };
    
    return stream;
};

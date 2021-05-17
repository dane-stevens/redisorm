const nanoid = require('nanoid')
const uuid = require('uuid')

const types = {
    NANOID: {
        set: (value) => value || nanoid(),
        get: (val) => val,
        validate: (val) => typeof val === 'string' && val.length === 21,
        type: 'string'
    },
    UUID: {
        set: (value) => value || uuid.v4(),
        get: (val) => val,
        validate: (val) => typeof val === 'string',
        type: 'string'
    },
    INTEGER: { 
        set: (val) => val,
        get: (val) => parseInt(val, 10),
        validate: (val) => typeof val === 'number',
        type: 'integer'
    },
    FLOAT: {
        set: (val) => val,
        get: (val) => parseFloat(val),
        validate: (val) => typeof val === 'number',
        type: 'float'
    },
    STRING: {
        set: (val, escape) => escape ? redisEscape(val) : val,
        get: (val, escape) => escape ? redisParse(val) : val,
        validate: (val) => typeof val === 'string',
        type: 'string'
    },
    ARRAY: {
        set: (val) => val.join(","),
        get: (val) => val.split(","),
        validate: (val) => Array.isArray(val),
        type: 'string'
    },
    BOOLEAN: {
        set: (val) => val ? 1 : 0,
        get: (val) => val === '1' || val === 'true' || val === 1,
        validate: (val) => typeof val === 'boolean',
        type: 'boolean'
    },
    JSON: {
        set: (val) => val ? JSON.stringify(val) : null,
        get: (val) => val ? JSON.parse(val) : null,
        validate: (val) => typeof val === 'object' || Array.isArray(val),
        type: 'string'
    },
    TIMESTAMP: {
        set: (val) => val ? val.toMillis() : null,
        get: (val) => val ? parseInt(val, 10) : null,
        validate: (val) => val.isValid,
        type: 'string'
    },
    ENUM: {
        set: (val) => val,
        get: (val) => val,
        validate: (val, values) => values.includes(val),
        values: [],
        type: 'string'
    }
}

function redisEscape(value) {
    const replacements = {
        ',': '\\,', 
        '.': '\\.',
        '<': '\\<',
        '>': '\\>',
        '{': '\\{',
        '}': '\\}',
        '[': '\\[',
        ']': '\\]',
        '"': '\\"',
        "'": "\\'",
        ':': '\\:',
        ';': '\\;',
        '!': '\\!',
        '@': '\\@',
        '#': '\\#',
        '$': '\\$',
        '%': '\\%',
        '^': '\\^',
        '&': '\\&',
        '*': '\\*',
        '(': '\\(',
        ')': '\\)',
        '-': '\\-',
        '+': '\\+',
        '=': '\\=',
        '~': '\\~',
    }
  
    const newValue = value.replace(/,|\.|<|>|\{|\}|\[|\]|"|'|:|;|!|@|#|\$|%|\^|&|\*|\(|\)|-|\+|=|~/g, function(x) {
        return replacements[x]
    })
    return newValue
  }

function redisParse(value) {
    const replacements = {
        '\\,': ',', 
        '\\.': '.',
        '\\<': '<',
        '\\>': '>',
        '\\{': '{',
        '\\}': '}',
        '\\[': '[',
        '\\]': ']',
        '\\"': '"',
        "\\'": "'",
        '\\:': ':',
        '\\;': ';',
        '\\!': '!',
        '\\@': '@',
        '\\#': '#',
        '\\$': '$',
        '\\%': '%',
        '\\^': '^',
        '\\&': '&',
        '\\*': '*',
        '\\(': '(',
        '\\)': ')',
        '\\-': '-',
        '\\+': '+',
        '\\=': '=',
        '\\~': '~',
    }
  
    const newValue = value.replace(/\,|\\.|\<|\>|\\{|\\}|\\\[|\\]|\"|\'|\:|\;|\!|\@|\#|\\$|\%|\\^|\&|\\\*|\\(|\\)|\-|\\+|\=|\~/g, function(x) {
        console.log('X----',x, replacements[x])
        return replacements[x]
    })
    return newValue
  }

module.exports = types
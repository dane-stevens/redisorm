const redis = require("redis")
const bluebird = require("bluebird")
const pluralize = require("pluralize")
const DataTypes = require("./types")

redis.addCommand('FT.CREATE')
redis.addCommand('FT.SEARCH')

bluebird.promisifyAll(redis)

class RedisORM {

    constructor(host, port, password, options) {
        this.client = redis.createClient({ host, port, password })
        this.options = options
    }

    define(hash, schema, options = {}) {

        const hashDefine = {}
        for (const field in schema) {
            const operators = {
                ...(typeof schema[field].type === 'object' && schema[field].type),
                ...(typeof schema[field].type === 'string' && schema[field])
            }
            if (typeof schema[field].type === 'object') {
                if (schema[field].set) {
                    operators.set = (val) => schema[field].set(schema[field].type.set(val))
                }
                if (schema[field].get) {
                    operators.get = (val) => schema[field].get(schema[field].type.get(val))
                }
                if (schema[field].values) {
                    operators.values = schema[field].values
                }
            }
            hashDefine[field] = operators
        }

        if (options.initializeSearch) {
            try {

                const fields = []
                for (const field in options.fields) {
                    fields.push(options.fields[field].field)
                    fields.push(options.fields[field].type)
                    if (options.fields[field].sortable) fields.push('SORTABLE')
                }

                this.client.sendCommandAsync('FT.DROPINDEX', [`${ hash }:idx`])
                this.client.sendCommandAsync(`FT.CREATE`, [
                    `${ hash }:idx`, `PREFIX`, 1, `${ hash }:`, 'SCHEMA', 
                    ...fields
                ])
            }
            catch (err) {
                console.log(err)
            }
        }

        return { 
            set: (values) => set(values, hashDefine, hash, this.client, this.options),
            get: (values) => get(values, hashDefine, hash, this.client, this.options),
            getAll: (search, limit, offset) => getAll(search, limit, offset, hashDefine, hash, this.client, this.options),
            schema: hashDefine,
        }

    }

    
    
}

RedisORM.DataTypes = DataTypes
for (const dataType in DataTypes) {
    RedisORM[dataType] = DataTypes[dataType]
}

class ValidationError extends Error {
    constructor(message, field, fix) {
        super(message, field)
        this.name = 'ValidationError',
        this.field = field
        this.fix = fix
    }
}


const keyPrefix = RedisORM.keyPrefix

const getKey = (hash, id) => `${ keyPrefix ? keyPrefix + ':' : '' }${ hash }${ id ? ':' + id : '' }`

const set = async (values, schema, hash, client, options) => {

    if (!values.id) values.id = schema.id.set()

    const hashKey = getKey(hash, values.id)

    const insert = [hashKey]

    const returnValues = {}

    for (const field in values) {
        if (typeof schema[field] !== 'object') throw new ValidationError(`Field level validation failed for: ${ field }. Unknown field.`)
        if (!schema[field].validate(values[field], schema[field].values)) throw new ValidationError(`Field level validation failed for: ${ field }`, field, `${ field } must be of type ${ schema[field].type }: a ${ typeof values[field] } value was provided`)

        const insertValue = schema[field].set(values[field], schema[field].escape)
        insert.push(field)
        insert.push(insertValue)
        returnValues[field] = schema[field].get(insertValue, schema[field].escape)
    }

    await client.hsetAsync(...insert)

    const setKey = getKey(hash + 's')
    await client.saddAsync(setKey, hashKey)

    // await client.sadd(setKey, hashKey + '|' + values.lat + '|' + values.lng)

    return returnValues

}

const get = async (id, schema, hash, client, options) => {
    const key = getKey(hash, id)
    const result = await client.hgetallAsync(key)
    const results = {}
    for (const field in result) {
        results[field] = schema[field].get(result[field], schema[field].escape)
    }
    return results
}

const getAll = async (search, limit = 10, offset = 0, schema, hash, client, options) => {

    if (!search) {

        const setKey = getKey(hash + 's')

        const [ nextOffset, keys ] = await client.sscanAsync(setKey, offset, 'COUNT ' + limit)
        
        const getResults = []
        for (let i = 0; i < keys.length; i++) {
            getResults.push(client.hgetallAsync(keys[i]))
        }

        const results = await Promise.all(getResults)

        const formattedResults = []
        for (let i = 0; i < results.length; i++) {
            const obj = {}
            for (const key in results[i]) {
                obj[key] = schema[key].get(results[i][key], schema[key].escape)
            }
            formattedResults.push(obj)
        }

        return {
            cursor: Number(nextOffset),
            results: formattedResults
        }
    
    }

    const key = getKey(hash, 'idx')
    const results = await client.sendCommandAsync('ft.search', [key, search, 'LIMIT', offset, limit])

    const [ count, ...rest ] = results

    const formattedResults = []
    for (let i = 0; i < rest.length; i++) {
        if (i % 2 === 0) {
            const key = rest[i]
            const result = rest[i + 1]
            const obj = {}
            for (let ii = 0; ii < result.length; ii++) {
                if (ii % 2 === 0) {
                    const field = result[ii]
                    const value = result[ii + 1]
                    obj.key = key
                    obj[field] = schema[field].get(value, schema[field].escape)
                }
            }
            formattedResults.push(obj)
        }
    }

    return {
        count: Number(count),
        results: formattedResults
    }

}

RedisORM.prototype.RedisORM = RedisORM

module.exports = RedisORM
module.exports.RedisORM = RedisORM
module.exports.default = RedisORM
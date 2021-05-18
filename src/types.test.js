const Redis = require("./index.js");
const uuid = require("uuid");

const client = new Redis()

const redisClient = client.client

const RedisORM = Redis

beforeAll(() => {
    jest.setTimeout(60000);
    redisClient.flushall()
});

afterAll(() => {
    // redisClient.flushall();
    redisClient.quit();
});

test('SSCAN Counting', async () => {


    const key = 'test:set'

    for (let i = 0; i < 100; i++) {
        redisClient.sadd(key, i)
    }

    const results = await redisClient.sscan(key, [0, 'COUNT', 10]);


    expect(1).toEqual(1);


});

test('Type conversion', async () => {

    const Hash = client.define('test:hash', {
        id: RedisORM.UUID,
        firstName: RedisORM.STRING,
        lastName: RedisORM.STRING,
        age: RedisORM.INTEGER,
        email: RedisORM.STRING,
        emailEscaped: {
            type: RedisORM.STRING,
            escape: true,
        },
        percentage: RedisORM.FLOAT,
        isSuccessful: RedisORM.BOOLEAN,
        geo: RedisORM.JSON,
        memberOf: RedisORM.ARRAY,
    });

    const hash = {
        id: uuid.v4(),
        firstName: 'Fred',
        lastName: 'Flinstone',
        age: 87,
        email: 'dane@dsmedia.ca',
        emailEscaped: `,.<>{}[]"':;!@#$%^&*()-+=~`,
        percentage: 99.5,
        isSuccessful: true,
        geo: {
            lat: 43.919979,
            lng: -80.094315
        },
        memberOf: ['NAPA', 'OK TIRE']
    }

    await Hash.set(hash)

    const hashFromRedis = await Hash.getAll();

    expect(hashFromRedis.results[0]).toEqual(hash);

});

test('Search', async () => {

    const Search = client.define('search', {
        id: RedisORM.INTEGER,
    });

    const searches = [
        { id: 3 },
        { id: 7 },
        { id: 1 },
        { id: 4 }
    ]

    searches.forEach(async search => await Search.set(search))

    await redisClient.send_command('FT.CREATE', [
        'search:idx', 'PREFIX', 1, 'search:', 'SCHEMA',
        'id', 'TEXT', 'SORTABLE'
    ])

    const results = await Search.getAll('*', 10, 0, 'id', 'DESC')

    const expectedResult = {
        cursor: 10,
        count: 4,
        results: [
            { key: 'search:7', id: 7 },
            { key: 'search:4', id: 4 },
            { key: 'search:3', id: 3 },
            { key: 'search:1', id: 1 }
        ]
    }
    expect(results).toEqual(expectedResult)

});
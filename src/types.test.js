const Redis = require("./index.js");
const uuid = require("uuid");

const client = new Redis()

const redisClient = client.client

const RedisORM = Redis

beforeAll(() => {
    jest.setTimeout(60000);
});

afterAll(() => {
    redisClient.flushall();
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
        percentage: 99.5,
        isSuccessful: true,
        geo: {
            lat: 43.919979,
            lng: -80.094315
        },
        memberOf: ['NAPA', 'OK TIRE']
    }

    await Hash.set(hash)

    const hashFromRedis = await Hash.getAll()

    expect(hashFromRedis.results[0]).toEqual(hash);

});
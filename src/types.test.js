const Redis = require("./index.js");
const uuid = require("uuid");

const client = new Redis()

const RedisORM = Redis

beforeAll(() => {
    jest.setTimeout(60000);
});

afterAll(() => {
    client.client.flushall();
    client.client.quit();
});

test('Type conversion', async () => {

    const Hash = client.define('test:hash', {
        id: RedisORM.UUID,
        firstName: RedisORM.STRING,
        lastName: RedisORM.STRING,
        age: RedisORM.INTEGER,
        percentage: RedisORM.FLOAT,
        isSuccessful: RedisORM.BOOLEAN,
        geo: RedisORM.JSON
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
        }
    }

    await Hash.set(hash)

    const hashFromRedis = await Hash.getAll()

    expect(hashFromRedis.results[0]).toEqual(hash);

});
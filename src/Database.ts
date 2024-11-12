import {
    CreateIndexesOptions,
    Db,
    Document, Filter,
    FindOptions,
    IndexSpecification,
    InsertOneResult,
    MongoClient,
    MongoError, Sort
} from 'mongodb'
import {ErrUnknownError} from "./errors";


export interface DatabaseConnectOptions {
    host?: string
    port?: number
    databaseName: string
    username: string
    password: string
}

type Limit = [number, number?]

export class Database {
    private _client: MongoClient
    private _db!: Db
    private readonly _dbName: string

    public getClient(): MongoClient {
        return this._client
    }

    constructor(opts: DatabaseConnectOptions) {
        const uri = 'mongodb://' + opts.username + ':' + opts.password + '@' + (opts.host || 'localhost') + ':' + (opts.port || 27017) + '/' + opts.databaseName
        this._dbName = opts.databaseName
        this._client = new MongoClient(uri, {
            connectTimeoutMS: 1000,
        })
    }

    public async connect(): Promise<boolean> {
        try {
            await this._client.connect()
            this._db = this._client.db(this._dbName)
            return true
        } catch (error: any) {
            return error
        }
    }

    public async createIndex(collectionName: string, indexSpec: IndexSpecification, options?: CreateIndexesOptions): Promise<string> {
        const collection = this._db.collection(collectionName)
        return await collection.createIndex(indexSpec, options)
    }

    public async collectionExists(collName: string): Promise<boolean> {
        const collections = await this._db.listCollections({ name: collName }).toArray()
        return collections.length > 0
    }

    public async createCollection(collName: string, autoIncrement: boolean): Promise<boolean> {
        await this._db.createCollection(collName)
        if (autoIncrement) {
            await this._db.collection(collName).createIndex({id: 1}, {unique: true})
        }
        return true
    }

    public async updateCell(collection: string, key: string, value: unknown, where: any = {}) {
        try {
            return await this._db.collection(collection).updateOne(
                where,
                { $set: { [key]: value } }
            );
        } catch (e) {
            return e as Error
        }
    }

    public async insert(collectionName: string, doc: any, ignore?: boolean) {
        const collection = this._db.collection(collectionName)
        try {
            return await collection.insertOne(doc)
        } catch (e) {
            const error = e as MongoError
            if (ignore && error.code === 11000) {
                return {} as InsertOneResult
            } else {
                return error
            }
        }
    }

    public async insertOne(collectionName: string, doc: any, ignore?: boolean) {
        const collection = this._db.collection(collectionName)
        try {
            return await collection.insertOne(doc)
        } catch (e) {
            const error = e as MongoError
            if (error.code === 11000 && ignore) {
                return null
            } else {
                return error
            }
        }
    }

    public async updateOne(collectionName: string, doc: any, where: any) {
        const collection = this._db.collection(collectionName)
        try {
            return await collection.updateOne(where, {
                $set: doc
            })
        } catch (e) {
            return e as MongoError
        }
    }

    public async incrementValue(collectionName: string, key: string, where: any) {
        const collection = this._db.collection(collectionName)
        try {
            return await collection.updateOne(where, {
                $inc: { [key]: 1,  }
            })
        } catch (e) {
            return e as Error
        }
    }

    public async count(collectionName: string, filter: Filter<Document>) {
        const collection = this._db.collection(collectionName)
        return await collection.countDocuments(filter)
    }

    public async select(collectionName: string, keys: string[], where: object, limit?: Limit, sort?: Sort) {
        const collection = this._db.collection(collectionName)
        const projection: Document = {}
        for (const key of keys) {
            projection[key] = 1
        }

        const findOptions: FindOptions = {projection: projection}
        if (sort) {
            findOptions.sort = sort
        }
        if (limit !== undefined) {
            if (limit.length === 1) {
                findOptions.limit = limit[0]
            } else {
                findOptions.skip = limit[0]
                findOptions.limit = limit[1]
            }
        }
        try {
            return await collection.find(where, findOptions).toArray()
        } catch (e) {
            if (e instanceof Error) {
                return e
            } else {
                return ErrUnknownError
            }
        }
    }

    public async selectRow(collectionName: string, keys: string[], where: object) {
        const collection = this._db.collection(collectionName)
        const projection: Document = {}
        for (const key of keys) {
            projection[key] = 1
        }
        try {
            return await collection.findOne(where, {projection: projection})
        } catch (e) {
            if (e instanceof Error) {
                return e
            } else {
                return ErrUnknownError
            }
        }
    }

    public async selectCell(collectionName: string, keyName: string, where?: any): Promise<unknown | null | Error> {
        const collection = this._db.collection(collectionName)
        const result = await collection.findOne(where, {projection: {[keyName]: 1}})
        if (result instanceof Error) {
            return result
        } else if (result !== null) {
            return result[keyName]
        } else {
            return null
        }
    }
}


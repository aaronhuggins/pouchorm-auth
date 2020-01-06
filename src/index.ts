import { PouchCollection, PouchModel, CollectionState, PouchORM } from 'pouchorm';
import * as retry from 'async-retry';
import * as PouchAuth from 'pouchdb-auth';

declare namespace PouchAuth {
    interface AuthenticationDBOptions {
        isOnlineAuthDB?: boolean;
        timeout?: number;
        secret?: string;
        admins?: { [key: string]: string };
        iterations?: number;
    }

    interface SignUpOptions {
        roles: string[];
        [key: string]: any;
    }

    interface LoginResponse {
        ok: true;
    }

    interface SessionResponse {
        ok: true;
        userCtx: {
            name?: string
            roles: string[]
        };
        info: {
            authentication_handlers: string[]
        };
    }
}

class PouchOrmAuthError extends Error {
    constructor(message?: string) {
        super(message);
    }
}

class PouchAuthMethods extends PouchCollection<PouchUser> {
    static _authState = CollectionState.NEW;

    static userId = function (username: string) {
        return COUCH_USER_NAMESPACE + username;
    };

    static checkAuthInit = async function () {
        if (this._authState === CollectionState.READY) {
            return;
        }

        if (this._authState === CollectionState.NEW) {
            return this.useAsAuthenticationDB();
        }

        if (this._authState === CollectionState.LOADING) {
            // The most probable way we arrive here is if a previous attemot to init collection failed.
            // We should wait for init's retries. Honestly this is an extreme case...
            return retry(async (bail) => {
                // if anything throws, we retry
                console.log(`waiting for initialization of ${this.constructor.name}...`);
                if (this._state === CollectionState.READY) {
                    throw new Error(`PouchCollection: Cannot perform operations on uninitialized collection ${this.constructor.name}`);
                }
            }, {
                retries: 3,
                minTimeout: 2000
            });
        }
    };

    static useAsAuthCollection = async function (options?: PouchAuth.AuthenticationDBOptions): Promise<void> {
        const pouchDbProperties = Object.getOwnPropertyNames(PouchORM.PouchDB.prototype);

        if (!pouchDbProperties.includes('useAsAuthenticationDB')) {
            PouchORM.PouchDB.plugin(PouchAuth);
        }

        await this.db.useAsAuthenticationDB(options);

        this._authState = CollectionState.READY;
    };

    static stopUsingAsAuthCollection = function () {
        this.db.stopUsingAsAuthenticationDB();
    };

    static signUp = async function (username: string, password: string, options?: PouchAuth.SignUpOptions) {
        await this.checkAuthInit();

        const user = new PouchUser({
            name: username,
            password: password,
            roles: [],
            ...options
        });

        return this.upsert(user, (existing) => {
            if (existing) {
                throw new PouchOrmAuthError(`User name '${username}' already exists. Rejecting user signup.`);
            }

            return user;
        });
    };

    static logIn = async function (username: string, password: string) {
        await this.checkAuthInit();
        const login = await this.db.logIn(username, password);

        if (login.ok) {
            return this.findById(this.userId(login.name));
        } else {
            return;
        }
    };

    static logOut = async function () {
        await this.checkAuthInit();

        return this.db.logOut();
    };

    static session = async function () {
        await this.checkAuthInit();

        return this.db.session();
    };
}

class PouchAuthCollection<T> extends PouchCollection<PouchUser> {
    _authState: CollectionState;
    userId: (username: string) => string;
    checkAuthInit: () => Promise<void>;
    useAsAuthCollection: () => Promise<void>;
    stopUsingAsAuthCollection: () => void;
    signUp: (username: string, password: string, options?: PouchAuth.SignUpOptions) => Promise<T>;
    logIn: (username: string, password: string) => Promise<T> | Promise<void>;
    logOut: () => Promise<PouchAuth.LoginResponse>;
    session: () => Promise<PouchAuth.SessionResponse>;
}

export const COUCH_USER_NAMESPACE = 'org.couchdb.user:';

export class PouchUser extends PouchModel<PouchUser> {
    constructor(itemOrUsername: string | PouchUser, password?: string) {
        let item: PouchUser;

        if (typeof itemOrUsername === 'string') {
            if (password === undefined || typeof password !== 'string') {
                throw new PouchOrmAuthError('User password provided must be a string.');
            }

            item = {
                name: itemOrUsername,
                password: password
            };
        } else {
            item = itemOrUsername;
        }

        super(item);

        if (this._id === undefined || this._id.substring(0, COUCH_USER_NAMESPACE.length) !== COUCH_USER_NAMESPACE) {
            this._id = COUCH_USER_NAMESPACE + this.name;
        }

        if (this.roles === undefined || !Array.isArray(this.roles)) {
            const roles = [];
            if (typeof this.roles === 'string') {
                roles.push(this.roles);
            }

            this.roles = roles;
        }

        this.type = 'user';

        if (this._id.substring(COUCH_USER_NAMESPACE.length, this._id.length) !== this.name) {
            throw new PouchOrmAuthError(`User name '${this.name}' does not match _id '${this._id}'.`);
        }
    }

    _id?: string;
    type?: string;
    name: string;
    password: string;
    roles?: string[];
}

export async function createPouchAuthCollection<T>(collection: PouchCollection<any>): Promise<PouchAuthCollection<T>> {
    const authCollection: PouchAuthCollection<T> = Object.assign(collection, PouchAuthMethods) as PouchAuthCollection<T>;

    await authCollection.useAsAuthCollection();

    return authCollection;
}

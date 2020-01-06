# PouchORM-Auth

A plugin for [PouchORM](https://github.com/iyobo/pouchorm) - the definitive ORM for working with [PouchDB](https://github.com/pouchdb/pouchdb).

This plugin makes it easy to use a PouchORM collection as an authentication backend. This leverages the great [PouchDB-Auth](https://github.com/pouchdb/pouchdb-server/tree/master/packages/node_modules/pouchdb-auth) plugin written for PouchDB Server.

## To install
`npm i pouchorm-auth`

or if you prefer yarn:
`yarn add pouchorm-auth`

Make sure to also install `pouchorm` as a dependency of your project using `npm` or `yarn`.

## How to Use

Consider this definition of a collection which uses the built-in exported model `PouchUser`.
```typescript
// Person.ts

    import { PouchCollection, PouchORM } from 'pouchorm';
    import { PouchUser, createPouchAuthCollection } from 'pouchorm-auth'

    PouchORM.LOGGING = true; // enable diagnostic logging if desired

    export class UserCollection extends PouchCollection<PouchUser> {
    }
    
```

Now that we have defined our **Collection** for that model, here is how we instantiate authentication collections.
       
```typescript

    // instantiate a collection by giving it the dbname it should use
    let userCollection = new UserCollection('usersdb');

    // Transform the collection.
    userCollection = createPouchAuthCollection<PouchUser>(userCollection)

    export userCollection

```

From this point:
 - We have our definitions
 - We have our collection instances
 
We are ready to start authenticating!

```typescript
    import { PouchUser } from 'pouchorm-auth'
    import { userCollection } from '...'

    // Using collections
    let somePerson: PouchUser = await userCollection.signUp(
        'jeanluc@picard.net',
        'Darmok and Jalad at Tanagra',
        {
            age: 24,
            email: 'jeanluc@picard.net'
        }
    )

    somePerson = await personCollection.logIn('jeanluc@picard.net', 'Darmok and Jalad at Tanagra');
    
    // somePerson has been persisted and will now also have some metafields like _id, _rev, etc.

    // Some data to be updated, which would need an upsert merge deltaFunction
    // so that the password is not lost from the existing record
    somePerson.age = 45;
    somePerson = await personCollection.upsert(somePerson, (existing) => { ...existing, ...somePerson });

    // changes to somePerson has been persisted. _rev would have also changed.

    const result: PouchUser[] = await personCollection.find({age: 45})
    
    // result.length === 1

```

## PouchCollection instance API reference
Consider that `T` is the provided type or class definition of your model. It is recommended that User models extend from class `PouchUser` to retain special logic designed to work with Pouch and Couch.

### Constructor
`createPouchAuthCollection<T>(collection: PouchCollection<T>)`

### Methods dynamically added to collection
These methods were added to provide collection-specific functionality
  - `userId(username: string) => string`
  - `checkAuthInit() => Promise<void>`
  - `useAsAuthCollection() => Promise<void>`
  - `stopUsingAsAuthCollection() => void`

These methods are wrappers for functionality provided by `pouchdb-auth`; see their [documentation](https://github.com/pouchdb/pouchdb-server/tree/master/packages/node_modules/pouchdb-auth) for specifics
  - `signUp(username: string, password: string, options?: PouchAuth.SignUpOptions) => Promise<T>`
  - `logIn(username: string, password: string) => Promise<T> | Promise<void>`
  - `logOut() => Promise<PouchAuth.LoginResponse>`
  - `session() => Promise<PouchAuth.SessionResponse>`

## Supporting the Project
PRs are welcome.
NOTE: Tests required for new PR acceptance. Those are easy to make as well.
   
# Contributors

- Aaron Huggins
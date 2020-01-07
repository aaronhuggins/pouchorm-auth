import { PouchORM } from 'pouchorm';
import { PouchUser, createPouchAuthCollection, PouchAuthCollection } from '../index';
import { UserCollection } from './TestClasses';

describe('Module PouchORM Auth', () => {
    const USER_NAME = 'jeanluc@picard.net';
    const USER_PASS = 'Darmok and Jalad at Tanagra';
    let userCollection = new UserCollection('unit_test', { prefix: 'unit_test_db/' }) as PouchAuthCollection<PouchUser>;

    beforeAll(async () => {
        PouchORM.clearDatabase('unit_test');
    });

    it('should error if authentication not initialized', async () => {
        expect(() => userCollection.checkAuthInit())
            .toThrowError(new TypeError('userCollection.checkAuthInit is not a function'));
    });

    it('should create authentication collection', async () => {
        userCollection = await createPouchAuthCollection<PouchUser>(userCollection);

        await userCollection.checkAuthInit();
    });

    it('should sign up and login user', async () => {
        const user = await userCollection.signUp(USER_NAME, USER_PASS);

        expect(user.name).toEqual(USER_NAME);
    });

    it('should log in user', async () => {
        const user = await userCollection.logIn(USER_NAME, USER_PASS);

        expect(user._id).toEqual(userCollection.userId(USER_NAME));
    });

    it('should get user session', async () => {
        const response = await userCollection.session();

        expect(response.userCtx.name).toEqual(USER_NAME);
    });

    it('should log out user', async () => {
        const response = await userCollection.logOut();

        expect(response.ok).toEqual(true);
    });

    it('should stop using as authentication collection', async () => {
        userCollection.stopUsingAsAuthCollection();

        expect(userCollection.logIn(USER_NAME, USER_PASS))
            .rejects
            .toEqual(new TypeError('this.db.logIn is not a function'));
    });
});

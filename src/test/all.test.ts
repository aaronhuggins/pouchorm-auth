import { PouchUser, createPouchAuthCollection } from '../index'
import { UserCollection } from './TestClasses'

describe('Module PouchORM Auth', () => {
    const USER_NAME = 'jeanluc@picard.net';
    const USER_PASS = 'Darmok and Jalad at Tanagra';
    let userCollection = new UserCollection('unit_test', { prefix: 'unit_test_db/' });

    it('should create authentication collection', async () => {
        userCollection = await createPouchAuthCollection<PouchUser>(userCollection);
    })

    /*it('should sign up user', async () => {
        
    })*/
})

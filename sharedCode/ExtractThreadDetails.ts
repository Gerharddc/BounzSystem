/**
 * Copyright (c) 2019-present, Bounz Media (Pty) Ltd
 * Created by Gerhard de Clercq
 */

export function extractThreadDetails(threadId: string) {
    console.log('Extracting thread details', threadId);
    const dict = new Map();

    const keyVals = threadId.split(';');

    for (const keyVal of keyVals) {
        const segs = keyVal.split(':');
        if (segs.length !== 2) {
            console.log('Invalid threadId key-value pair', keyVal);
            throw new Error('Invalid threadId key-value pair');
        }

        dict.set(segs[0], segs[1]);
    }

    if (dict.has('userIdA') && dict.has('userIdB')) {
        return {
            type: 'users',
            userIdA: dict.get('userIdA'),
            userIdB: dict.get('userIdB'),
        };
    } else if (dict.has('courtId')) {
        return {
            type: 'court',
            courtId: dict.get('courtId'),
        };
    } else {
        throw new Error('Unregocnised threadId type');
    }
}

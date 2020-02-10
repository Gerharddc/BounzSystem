/**
 * Copyright (c) 2019-present, Bounz Media (Pty) Ltd
 * Created by Herman Lombard
 */

import { Context } from "aws-lambda";
import { Invite } from './shared/Models';

export async function handler(event: any, context: Context) {
    if (!event.inviteId) {
        throw new Error("Called without inviteId");
    }

    if (!event.inviteeId) {
        throw new Error("Called without inviteeId");
    }

    const inviteId = event.inviteId;
    console.log('InviteId: ', inviteId);

    const inviteRecord = await Invite.findByPk(inviteId);

    const result = await Invite.update({
        inviteeId: event.inviteeId,
      }, {
        where: {
          inviteId: inviteId
        }
      });

    console.log('Result: ', result);  
    console.log('InviteRecord: ', inviteRecord); 
    
    return inviteRecord;
}


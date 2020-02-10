/**
 * Copyright (c) 2019-present, Bounz Media (Pty) Ltd
 * Created by Herman Lombard
 */

import { Context } from "aws-lambda";
import { InviteResponse } from './shared/Models';

export async function handler(event: any, context: Context) {
    if (!event.responseId) {
        throw new Error("Called without responseId");
    }

    const responseId = event.responseId;
    console.log('responseId: ', responseId);

    const responseInfo = await InviteResponse.findByPk(responseId);
    console.log('Response: ', responseInfo);
    
    return responseInfo.dataValues;
}


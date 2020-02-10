/**
 * Copyright (c) 2019-present, Bounz Media (Pty) Ltd
 * Created by Gerhard de Clercq
 */

import { Context } from "aws-lambda";
import { InviteResponse } from "./shared/Models";

export async function handler(event: any, context: Context) {
    if (!event.inviteId) {
        throw new Error("Event lacks inviteId");
    }
    const inviteId = event.inviteId;
    const responseId = event.inviteId;

    if (!event.responseType) {
        throw new Error("Event lacks responseType");
    }

    const responseType = event.responseType;

    const attendanceCount = event.attendanceCount;

    const comment = event.comment;

    // TODO: add check to ensure that caller is the owner of the event

    await InviteResponse.sync();
    const response = await InviteResponse.create({
        responseId,
        inviteId,
        responseType,
        attendanceCount,
        comment,
    });

    return response;
}


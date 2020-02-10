/**
 * Copyright (c) 2018-present, Bounz Media (Pty) Ltd
 * Created by Gerhard de Clercq
 */

import { Context } from "aws-lambda";
import * as AWS from "aws-sdk";
import { checkBlocked } from "./shared/CheckBlocked";
import { tagifyMentions } from "./shared/TagifyMentions";

const dynamo = new AWS.DynamoDB.DocumentClient();

export async function handler(event: any, context: Context) {
    const commentDate = new Date().toISOString();

    if (!event.commentorId) {
        throw new Error("Event lacks commentorId");
    }
    const commentorId = event.commentorId;

    if (!event.comment) {
        throw new Error("Event lacks comment");
    }
    const comment = event.comment.trim();

    if (comment.length > 500) {
        throw new Error("Comment is too long");
    }

    if (!event.postId) {
        throw new Error("Event lacks postId");
    }
    const postId = event.postId;
    const { posterId, postedDate } = extractPostDetails(postId);

    console.log(`Commenting on ${postId} for ${commentorId}`);
    console.log("Comment:", comment);

    const blocked = await checkBlocked(posterId, commentorId);
    console.log("blocked", blocked);
    if (blocked) {
        throw new Error("Post creator has blocked this user");
    }

    const sentPost = await getSentPost(posterId, postedDate);
    if (!sentPost) {
        // await flagUser(commentorId, 'Tried to comment non-existent post', 5);
        throw new Error("Post does not exist");
    }

    const tagifiedComment = await tagifyMentions(comment);
    await createRecord(postId, commentorId, commentDate, tagifiedComment);

    console.log("Completed");
    return {
        postId,
        comment: tagifiedComment,
        commentDate,
        commentorId
    };
}

async function getSentPost(creatorId: string, postedDate: string) {
    const params = {
        TableName: process.env.SENT_POSTS_TABLE,
        Key: {
            creatorId,
            postedDate
        }
    };

    return await dynamo.get(params).promise();
}

async function createRecord(
    postId: string,
    commentorId: string,
    commentDate: string,
    comment: string
) {
    const params = {
        TableName: process.env.COMMENTS_TABLE,
        Item: {
            postId,
            commentorId,
            commentDate,
            comment
        }
    };

    return await dynamo.put(params).promise();
}

function extractPostDetails(postId: string) {
    const parts = postId.split(";");

    if (parts.length !== 2) {
        throw new Error("Invalid postId");
    }

    const posterId = parts[0];
    const postedDate = parts[1];

    return { posterId, postedDate };
}

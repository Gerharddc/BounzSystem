/**
 * Copyright (c) 2019-present, Bounz Media (Pty) Ltd
 * Created by Gerhard de Clercq
 */

import Parser from 'react-native-dom-parser';

const tagRegex = /(<.[^(><.)]+>)/g;

export function extractMentions(text: string) {
    const tags = text.match(tagRegex);
    const users = new Set<string>();

    console.log('tags', tags);

    let newText = text;

    if (tags) {
        for (const tag of tags) {
            const dom = Parser(tag);

            if (dom.tagName !== 'Mention') {
                continue;
            }

            const ats = dom.attributes;
            if (ats.type === 'user') {
                users.add(ats.id);
                newText = newText.replace(tag, ats.display);
            }
        }
    }

    return { users, newText };
}
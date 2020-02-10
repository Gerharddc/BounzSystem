/**
 * Copyright (c) 2019-present, Bounz Media (Pty) Ltd
 * Created by Gerhard de Clercq
 */

import { Context } from 'aws-lambda';
import * as AWS from 'aws-sdk';
import * as dns from 'dns';
import * as md5 from 'md5';
import fetch from 'node-fetch';
import { incrementUserBounty } from './shared/DistributePosts';

function getIp(hostname: string): Promise<dns.LookupAddress[]> {
    return new Promise((resolve, reject) => {
        dns.lookup(hostname, { all: true }, (err, data) => {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        })
    });
}

function decodeComponents(body: string) {
    const map = new Map();
    const params = body.split('&');
    for (const par of params) {
        const parts = par.split('=');
        const key = parts[0];
        const value = decodeURIComponent(parts[1]);
        map.set(key, value);
    }

    return map;
}

export async function handler(event: any, context: Context) {
    try {
        console.log(JSON.stringify(event, undefined, 2));

        const components = decodeComponents(event.body);

        let checkStr = '';
        for (const comp of components) {
            if (comp[0] !== 'signature') {
                checkStr += comp[0] + '=' + encodeURIComponent(comp[1]) + '&';
            }
        }
        checkStr = checkStr.slice(0, -1);

        if (components.get('signature') !== md5(checkStr)) {
            throw new Error('Invalid signature');
        } else {
            console.log('Valid signature');
        }

        const validHosts = [
            'www.payfast.co.za',
            'sandbox.payfast.co.za',
            'w1w.payfast.co.za',
            'w2w.payfast.co.za',
        ];

        const validIps = new Set();

        // TODO: check in parallel
        for (const hostname of validHosts) {
            const ips = await getIp(hostname);
            for (const ip of ips) {
                validIps.add(ip.address);
            }
        }

        const ip = event.requestContext.identity.sourceIp;
        if (!validIps.has(ip)) {
            throw new Error('Invalid origin ip: ' + ip);
        } else {
            console.log('ip valid: ' + ip);
        }

        // TODO: check if amount matched order
        const user = components.get('custom_str1');
        const amount = components.get('amount_gross');
        const paymentId = components.get('m_payment_id');

        const resp = await fetch('https://sandbox.payfast.co.za/eng/query/validate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: event.body,
        });
        if (resp.statusText !== 'OK' || await resp.text() !== 'VALID') {
            throw new Error('PayFast validation failed');
        } else {
            console.log('PayFast validation succeeded');
        }

        console.log('Purchase of ' + amount + ' for ' + user);

        const credits = 50 * amount;
        await incrementUserBounty(user, credits);
        console.log('Incremented user bounty');

        console.log('Transaction complete');
    } catch (e) {
        console.log(e)
    }

    const response = {
        statusCode: 200,
        body: 'OK',
    };

    return response;
}


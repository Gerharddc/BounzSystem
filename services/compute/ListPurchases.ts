/**
 * Copyright (c) 2018-present, Bounz Media (Pty) Ltd
 * Created by Gerhard de Clercq
 */

import { Context } from "aws-lambda";
import { Sequelize, Model, DataTypes } from 'sequelize';

const sequelize = new Sequelize('postgres', 'Bounz', 'Password', {
    host: process.env.SQL_HOST,
    dialect: 'postgres',
});

class BountyPurchase extends Model {
    public purchaserId!: string;
    public purchaserDate!: Date;
    public bountyCount!: number;
    public randCount!: number;
}

BountyPurchase.init({
    purchaserId: {
        type: DataTypes.TEXT,
        allowNull: false,
        primaryKey: true,
    },
    purchaserDate: {
        type: 'TIMESTAMP',
        allowNull: false,
        primaryKey: true,
    },
    bountyCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    randCount: {
        type: DataTypes.REAL,
        allowNull: false,
    }
}, {
    sequelize,
    tableName: 'BountyPurchases',
});

export async function handler(event: any, context: Context) {
    try {
        //if (!event.queryStringParameters.username) {
        //    throw new Error("Called without username");
        //}

        await BountyPurchase.sync();
        const ding = await BountyPurchase.create({
            purchaserId: 'yesyes',
            purchaserDate: new Date(),
            bountyCount: 10,
            randCount: 1.5,
        })

        const response = {
            statusCode: 200,
            body: JSON.stringify({ ding })
        };

        return response;
    } catch (e) {
        const response = {
            statusCode: 500,
            body: JSON.stringify({ error: e.message })
        };

        return response;
    }
}


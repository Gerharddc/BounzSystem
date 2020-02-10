/**
 * Copyright (c) 2019-present, Bounz Media (Pty) Ltd
 * Created by Gerhard de Clercq
 */
import { Sequelize, Model, DataTypes, UUIDV4 } from 'sequelize';

const sequelize = new Sequelize('postgres', 'Bounz', 'Password', {
    host: process.env.SQL_HOST,
    dialect: 'postgres',
});

export class InviteResponse extends Model {
    public inviteId!: string;
    public responseType!: string;
    public attendanceCount!: number;
    public content!: string;
}

InviteResponse.init({
    inviteId: {
        type: DataTypes.TEXT,
        allowNull: false,
        primaryKey: true,
    },
    responseType: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    attendanceCount: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
}, {
        sequelize,
        tableName: 'inviteResponses',
    });
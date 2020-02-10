/**
 * Copyright (c) 2019-present, Bounz Media (Pty) Ltd
 * Created by Gerhard de Clercq
 */
import { Sequelize, Model, DataTypes, UUIDV4 } from 'sequelize';

const sequelize = new Sequelize('postgres', 'Bounz', 'Password', {
    host: process.env.SQL_HOST,
    dialect: 'postgres',
});

export class Invite extends Model {
    public inviteId!: string;
    public eventId!: string;
    public inviteeId: string;
    public inviteeName!: string;
    public inviteeSurname!: string;
    public attendanceLimit!: number;
}

Invite.init({
    inviteId: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: UUIDV4,
    },
    eventId: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    inviteeId: {
        type: DataTypes.UUID,
        allowNull: true,
    },
    inviteeName: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    inviteeSurname: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    attendanceLimit: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
}, {
        sequelize,
        tableName: 'invites',
    });
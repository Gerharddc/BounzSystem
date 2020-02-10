/**
 * Copyright (c) 2019-present, Bounz Media (Pty) Ltd
 * Created by Gerhard de Clercq
 */
import { Sequelize, Model, DataTypes, UUIDV4 } from 'sequelize';

export const sequelize = new Sequelize('postgres', 'Bounz', 'Password', {
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

export class Event extends Model {
    public eventId!: string;
    public title!: string;
    public type!: string;
    public description!: string;
    public location!: string;
    public ownerId!: string;
    public date!: string;
    public rsvpDate!: string;
}

Event.init({
    eventId: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: UUIDV4,
    },
    title: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    type: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    location: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    ownerId: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    date: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    rsvpDate: {
        type: DataTypes.DATE,
        allowNull: false,
    },
}, {
        sequelize,
        tableName: 'events',
    });

export class InviteResponse extends Model {
    public responseId!: string;
    public inviteId!: string;
    public responseType!: string;
    public attendanceCount!: number;
    public comment!: string;
}

InviteResponse.init({
    responseId: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
    },
    responseType: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    attendanceCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    comment: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
}, {
        sequelize,
        tableName: 'inviteResponses',
    });

Event.hasMany(Invite, { as: 'invite', foreignKey: 'eventId' });
Invite.belongsTo(Event, { as: 'event', foreignKey: 'eventId' });

Invite.hasOne(InviteResponse, { as: 'inviteResponse', foreignKey: 'inviteId' });
InviteResponse.belongsTo(Invite, { as: 'invite', foreignKey: 'inviteId' });
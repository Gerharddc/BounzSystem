/**
 * Copyright (c) 2019-present, Bounz Media (Pty) Ltd
 * Created by Gerhard de Clercq
 */
import { Sequelize, Model, DataTypes, UUIDV4 } from 'sequelize';

const sequelize = new Sequelize('postgres', 'Bounz', 'Password', {
    host: process.env.SQL_HOST,
    dialect: 'postgres',
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
        allowNull: true,
    },
    ownerId: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    date: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    rsvpDate: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
}, {
        sequelize,
        tableName: 'events',
    });
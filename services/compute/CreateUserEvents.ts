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

class Event extends Model {
    public eventId!: string;
    public description!: string;
    public location!: string;
    public ownerId!: string;
    public date!: Date;
    public rsvpDate!: Date;
}

Event.init({
    eventId: {
        type: DataTypes.NUMBER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
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
        type: DataTypes.TEXT,
        allowNull: false,
    },
    date: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    rsvpDate: {
        type: DataTypes.DATE,
        allowNull: false,
    }
}, {
        sequelize,
        tableName: 'Events',
    });

export async function handler(event: any, context: Context) {
    if (!event.ownerId) {
        throw new Error("Event lacks ownerId");
    }

    if (!event.description) {
        throw new Error("Event lacks description");
    }

    if (!event.location) {
        throw new Error("Event lacks location");
    }

    if (!event.date) {
        throw new Error("Event lacks date");
    }

    if (!event.rsvpDate) {
        throw new Error("Event lacks rsvpDate");
    }

    await Event.sync();
    const userEvent = await Event.create({
        description: event.eventId,
        location: event.location,
        ownerId: event.location,
        date: event.location,
        rsvpDate: event.location,
    })

    const response = userEvent

    return response;
}


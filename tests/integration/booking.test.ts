import app, { init } from "@/app";
import faker from "@faker-js/faker";
import supertest from "supertest";
import * as jwt from "jsonwebtoken";
import * as factory from "../factories";
import { TicketStatus } from "@prisma/client";
import {
    cleanDb, generateValidToken
} from "../helpers";

const server = supertest(app);

beforeAll(async () => {
    await init();
});

beforeEach(async () => {
    await cleanDb();
});

const token_invalid = faker.lorem.word();

describe("GET/booking", () => {

    it("not token ", async () => {
        const response = await server.get("/booking");

        expect(response.status).toBe(401);
    });

    it("token invalid", async () => {

        const response = await server.get("/booking").set("Authorization", `Bearer ${token_invalid}`);

        expect(response.status).toBe(401);
    });

    it("not session", async () => {

        const Session = await factory.createUser();

        const token = jwt.sign({ userId: Session.id }, process.env.JWT_SECRET);

        const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(401);

    });


    it("not reserve", async () => {

        const user = await factory.createUser();

        const token = await generateValidToken(user);

        const enrollment = await factory.createEnrollmentWithAddress(user);

        const ticketType = await factory.createTicketTypeWithHotel();

        const ticket = await factory.createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);

        await factory.createPayment(ticket.id, ticketType.price);

        const createdHotel = await factory.createHotel();

        await factory.createRoomWithHotelId(createdHotel.id);

        const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);

        expect(response.status).toEqual(404);
    });

    it("reserve ok", async () => {

        const user = await factory.createUser();

        const token = await generateValidToken(user);

        const enrollment = await factory.createEnrollmentWithAddress(user);

        const ticketType = await factory.createTicketTypeWithHotel();

        const ticket = await factory.createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);

        await factory.createPayment(ticket.id, ticketType.price);


        const hotel = await factory.createHotel();

        const room = await factory.createRoomWithHotelId(hotel.id);

        const booking = await factory.createBooking(room.id, user.id);

        const reserve = await server.get("/booking").set("Authorization", `Bearer ${token}`);

        expect(reserve.status).toEqual(200);
        expect(reserve.body).toEqual({
            id: booking.id,
            Room: {
                id: booking.Room.id,
                name: booking.Room.name,
                capacity: booking.Room.capacity,
                hotelId: booking.Room.hotelId,
                createdAt: booking.Room.createdAt.toISOString(),
                updatedAt: booking.Room.updatedAt.toISOString(),
            },
        });
    });

});

describe("POST /booking", () => {
    it("not token", async () => {
        const response = await server.post("/booking");

        expect(response.status).toBe(401);
    });

    it("token invalid", async () => {

        const response = await server.post("/booking").set("Authorization", `Bearer ${token_invalid}`);

        expect(response.status).toBe(401);
    });

    it("not session", async () => {

        const Session = await factory.createUser();

        const token = jwt.sign({ userId: Session.id }, process.env.JWT_SECRET);

        const response = await server.post("/booking").set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(401);

    });

    it("not reserve", async () => {

        const user = await factory.createUser();

        const token = await generateValidToken(user);

        const enrollment = await factory.createEnrollmentWithAddress(user);

        const ticketType = await factory.createTicketTypeWithHotel();

        const ticket = await factory.createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);

        await factory.createPayment(ticket.id, ticketType.price);

        const hotel = await factory.createHotel();

        await factory.createRoomWithHotelId(hotel.id);

        const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send({});

        expect(response.status).toEqual(403);
    });



    it("ticket not remote", async () => {

        const user = await factory.createUser();

        const token = await generateValidToken(user);

        const enrollment = await factory.createEnrollmentWithAddress(user);

        const ticketType = await factory.createTicketTypeRemote();

        const ticket = await factory.createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);

        await factory.createPayment(ticket.id, ticketType.price);

        const hotel = await factory.createHotel();

        const room = await factory.createRoomWithHotelId(hotel.id);

        const send = { roomId: room.id };

        const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send(send);

        expect(response.status).toEqual(404);

    });

    it("hotel include", async () => {
        const user = await factory.createUser();

        const token = await generateValidToken(user);

        const enrollment = await factory.createEnrollmentWithAddress(user);

        const ticketType = await factory.createTicketTypeWithHotel();

        const ticket = await factory.createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);

        await factory.createPayment(ticket.id, ticketType.price);

        const hotel = await factory.createHotel();

        const room = await factory.createRoomWithHotelId(hotel.id);

         const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send({ roomId: room.id });

        expect(response.status).toEqual(200);
        
    });

    it("not paid", async () => {

        const user = await factory.createUser();

        const token = await generateValidToken(user);

        const enrollment = await factory.createEnrollmentWithAddress(user);

        const ticketType = await factory.createTicketTypeWithHotel();

        const ticket = await factory.createTicket(enrollment.id, ticketType.id, TicketStatus.RESERVED);

        await factory.createPayment(ticket.id, ticketType.price);

        const hotel = await factory.createHotel();

        const room = await factory.createRoomWithHotelId(hotel.id);

        const send = { roomId: room.id };

        const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send(send);

        expect(response.status).toEqual(404);
    });

    it("room doesnt exist", async () => {

        const user = await factory.createUser();

        const token = await generateValidToken(user);

        const enrollment = await factory.createEnrollmentWithAddress(user);

        const ticketType = await factory.createTicketTypeWithHotel();

        const ticket = await factory.createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);

        await factory.createPayment(ticket.id, ticketType.price);

        await factory.createHotel();

        const send = { roomId: 1 };

        const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send(send);

        expect(response.status).toEqual(404);
    });

    it("room is full", async () => {

        const user = await factory.createUser();

        const otherUser = await factory.createUser();

        const token = await generateValidToken(user);

        const enrollment = await factory.createEnrollmentWithAddress(user);

        const ticketType = await factory.createTicketTypeWithHotel();

        const ticket = await factory.createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);

        await factory.createPayment(ticket.id, ticketType.price);

        const hotel = await factory.createHotel();

        const room = await factory.createRoomWithHotelId(hotel.id, 1);

        await factory.createBooking(room.id, otherUser.id);

        const send = { roomId: room.id };

        const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send(send);

        expect(response.status).toEqual(403);
    });

    it("post ok", async () => {
        const user = await factory.createUser();

        const token = await generateValidToken(user);

        const enrollment = await factory.createEnrollmentWithAddress(user);

        const ticketType = await factory.createTicketTypeWithHotel();

        const ticket = await factory.createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);

        await factory.createPayment(ticket.id, ticketType.price);

        const hotel = await factory.createHotel();

        const room = await factory.createRoomWithHotelId(hotel.id);

        const send = { roomId: room.id };

        const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send(send);

        expect(response.status).toEqual(200);

        expect(response.body).toEqual({ bookingId: expect.any(Number) });
    });
});

describe("PUT/booking/:bookingId", () => {

    it("not token", async () => {
        const response = await server.put("/booking/1");

        expect(response.status).toBe(401);
    });


    it("token invalid", async () => {

        const response = await server.put("/booking/1").set("Authorization", `Bearer ${token_invalid}`);

        expect(response.status).toBe(401);
    });

    it("not session", async () => {

        const Session = await factory.createUser();

        const token = jwt.sign({ userId: Session.id }, process.env.JWT_SECRET);

        const response = await server.put("/booking/1").set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(401);

    });



    it("not room id", async () => {
        const user = await factory.createUser();

        const token = await generateValidToken(user);

        const enrollment = await factory.createEnrollmentWithAddress(user);

        const ticketType = await factory.createTicketTypeWithHotel();

        const ticket = await factory.createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);

        await factory.createPayment(ticket.id, ticketType.price);

        const hotel = await factory.createHotel();

        await factory.createRoomWithHotelId(hotel.id);

        const response = await server.put("/booking/1").set("Authorization", `Bearer ${token}`).send({});

        expect(response.status).toEqual(403);
    });

    it("not reserve", async () => {
        const user = await factory.createUser();

        const otherUser = await factory.createUser();

        const token = await generateValidToken(user);

        const enrollment = await factory.createEnrollmentWithAddress(user);

        const ticketType = await factory.createTicketTypeWithHotel();

        const ticket = await factory.createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);

        await factory.createPayment(ticket.id, ticketType.price);

        const hotel = await factory.createHotel();

        const room = await factory.createRoomWithHotelId(hotel.id);

        const otherRoom = await factory.createRoomWithHotelId(hotel.id);

        const booking = await factory.createBooking(room.id, otherUser.id);

        const send = { roomId: otherRoom.id };

        const response = await server.put(`/booking/${booking.id}`).set("Authorization", `Bearer ${token}`).send(send);

        expect(response.status).toEqual(403);
    });

    it("parans not correct", async () => {

        const user = await factory.createUser();

        const otherUser = await factory.createUser();

        const token = await generateValidToken(user);

        const enrollment = await factory.createEnrollmentWithAddress(user);

        const ticketType = await factory.createTicketTypeWithHotel();

        const ticket = await factory.createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);

        await factory.createPayment(ticket.id, ticketType.price);

        const hotel = await factory.createHotel();

        const room = await factory.createRoomWithHotelId(hotel.id);

        const otherRoom = await factory.createRoomWithHotelId(hotel.id);

        const otherBooking = await factory.createBooking(room.id, otherUser.id);

        await factory.createBooking(room.id, user.id);

        const send = { roomId: otherRoom.id };

        const response = await server.put(`/booking/${otherBooking.id}`).set("Authorization", `Bearer ${token}`).send(send);

        expect(response.status).toEqual(401);
    });

    it("room not exist", async () => {
        const user = await factory.createUser();

        const token = await generateValidToken(user);

        const enrollment = await factory.createEnrollmentWithAddress(user);

        const ticketType = await factory.createTicketTypeWithHotel();

        const ticket = await factory.createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);

        await factory.createPayment(ticket.id, ticketType.price);

        const hotel = await factory.createHotel();

        const room = await factory.createRoomWithHotelId(hotel.id);

        const booking = await factory.createBooking(room.id, user.id);

        const response = await server.put(`/booking/${booking.id}`).set("Authorization", `Bearer ${token}`).send({ roomId: 1 });

        expect(response.status).toEqual(404);
    });

    it("room full", async () => {
        const user = await factory.createUser();

        const otherUser = await factory.createUser();

        const token = await generateValidToken(user);

        const enrollment = await factory.createEnrollmentWithAddress(user);

        const ticketType = await factory.createTicketTypeWithHotel();

        const ticket = await factory.createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);

        await factory.createPayment(ticket.id, ticketType.price);

        const hotel = await factory.createHotel();

        const room = await factory.createRoomWithHotelId(hotel.id);

        const otherRoom = await factory.createRoomWithHotelId(hotel.id, 1);

        const booking = await factory.createBooking(room.id, user.id);

        await factory.createBooking(otherRoom.id, otherUser.id);

        const response = await server.put(`/booking/${booking.id}`).set("Authorization", `Bearer ${token}`).send({ roomId: otherRoom.id });

        expect(response.status).toEqual(403);
    });

    it("put ok", async () => {
        const user = await factory.createUser();

        const token = await generateValidToken(user);

        const enrollment = await factory.createEnrollmentWithAddress(user);

        const ticketType = await factory.createTicketTypeWithHotel();

        const ticket = await factory.createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);

        await factory.createPayment(ticket.id, ticketType.price);

        const hotel = await factory.createHotel();

        const room = await factory.createRoomWithHotelId(hotel.id);

        const otherRoom = await factory.createRoomWithHotelId(hotel.id);

        const booking = await factory.createBooking(room.id, user.id);

        const response = await server.put(`/booking/${booking.id}`).set("Authorization", `Bearer ${token}`).send({ roomId: otherRoom.id });

        expect(response.status).toEqual(200);

        expect(response.body).toEqual({ bookingId: expect.any(Number) });
    });
});

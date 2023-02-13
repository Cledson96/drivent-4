import { AuthenticatedRequest } from "@/middlewares";
import { Response } from "express";
import bookingService from "@/services/booking-service";

export async function getBooking(req: AuthenticatedRequest, res: Response) {
    const { userId } = req;

    try {
        const booking = await bookingService.getBookingUserId(+userId);
        return res.status(200).send(booking);
    } catch (error) {
        if (error.name === "NotFoundError") {
            return res.sendStatus(404);
        }
        return res.sendStatus(500);
    }
}

export async function postBooking(req: AuthenticatedRequest, res: Response) {
    const {
        userId,
        body: { roomId },
    } = req;

    try {
        const bookingCreatedId = await bookingService.postBooking(+roomId, +userId);
        return res.status(200).send(bookingCreatedId);
    } catch (error) {
        if (error.name === "NotFoundError") {
            return res.sendStatus(404);
        }
        if (error.name === "NoVacancies") {
            return res.sendStatus(403);
        }
        return res.sendStatus(403);
    }
}

export async function putBooking(req: AuthenticatedRequest, res: Response) {

    const {
        userId,
        body: { roomId },
        params: { bookingId },
    } = req;

    try {
        const bookingUpdatedId = await bookingService.putBooking(+roomId, +bookingId, +userId);
        return res.status(200).send(bookingUpdatedId);
    } catch (error) {
        if (error.name === "NotFoundError") {
            return res.sendStatus(404);
        }
        if (error.name === "UnauthorizedError") {
            return res.sendStatus(401);
        }
        if (error.name === "NoVacancies") {
            return res.sendStatus(403);
        }
        return res.sendStatus(403);
    }
}
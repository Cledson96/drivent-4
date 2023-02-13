import { notFoundError, unauthorizedError } from "@/errors";
import bookingRepository from "@/repositories/booking-repository";
import ticketRepository from "@/repositories/ticket-repository";
import { RoomUser } from "@/protocols";

async function getBookingUserId(id: number): Promise<RoomUser> {
    const room = await bookingRepository.findBookingById(id);
    if (!room) throw notFoundError();

    return room;
}


async function postBooking(roomId: number, userId: number) {
    if (!roomId) throw new Error("Room ID required");

    const ticket = await ticketRepository.findTicketUserId(userId);
    const notPaidTicket = ticket.status === "RESERVED";
    const RemoteTicket = ticket.TicketType.isRemote;


    const notIncludesHotel = !ticket.TicketType.includesHotel;
    const room = await bookingRepository.findRoom(roomId);
    if (RemoteTicket || notPaidTicket || notIncludesHotel || !room) throw notFoundError();

    const novacanciesInRoom = room.capacity === room.Booking.length;

    if (novacanciesInRoom) throw new Error("NoVacancies");

    const { id: bookingId } = await bookingRepository.createBooking(roomId, userId);

    return { bookingId };
}

async function putBooking(roomId: number, bookingId: number, userId: number) {
    if (!roomId) throw new Error("Room ID required");

    const Booking = await bookingRepository.findBookingById(userId);
    if (!Booking) throw new Error("NoVacancies")

    const isUserBooking = Booking.id === bookingId;

    if (!isUserBooking) throw unauthorizedError();

    const room = await bookingRepository.findRoom(roomId);
    if (!room) throw notFoundError();

    const VacanciesInRoom = room.capacity === room.Booking.length;
    if (VacanciesInRoom) throw new Error("NoVacancies")

    const { id: newBookingId } = await bookingRepository.putBooking(bookingId, roomId);

    return { bookingId: newBookingId };
}

const bookingService = {
    getBookingUserId,
    postBooking,
    putBooking,
};

export default bookingService;
import { prisma } from "@/config";

async function createBooking(roomId: number, userId: number) {
    return prisma.booking.create({
        data: {
            userId,
            roomId,
        },
    });
}

async function findBookingById(id: number) {
    return prisma.booking.findFirst({
        where: {
            userId: id,
        },
        select: {
            id: true,
            Room: true,
        },
    });
}

async function findRoom(id: number) {
    return prisma.room.findUnique({
        where: {
            id,
        },
        include: {
            Booking: true,
        },
    });
}


async function putBooking(bookingId: number, roomId: number) {
    return prisma.booking.update({
        where: {
            id: bookingId,
        },
        data: {
            roomId: roomId,
        },
    });
}


const bookingRepository = {
    findRoom,
    findBookingById,
    createBooking,
    putBooking,
};

export default bookingRepository;
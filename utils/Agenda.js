const mongoose = require('mongoose');
const Seat = require('../model/seatModel');
const SeatReservationNotification = require('../model/SeatReservationNotification');

module.exports = (agenda) => {

  agenda.define('send reservation notification', async (job) => {
    const { seatId, studentId } = job.attrs.data;
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const seat = await Seat.findById(seatId).session(session);
      if (!seat || seat.isAvailable || seat.reservedBy.toString() !== studentId) {
        await session.abortTransaction();
        return;
      }

      const deadline = new Date(Date.now() + 60 * 1000); // 1 min

      const [notification] = await SeatReservationNotification.create([{
        studentId,
        seatId,
        message: `Your seat ${seat.seatNumber} reservation is about to expire. Extend or release?`,
        requiresAction: true,
        deadline,
        actionResponse: 'pending',
        notificationType: 'reminder'
      }], { session });

      await agenda.schedule(deadline, 'auto release seat', {
        seatId,
        studentId,
        notificationId: notification._id
      });

      await session.commitTransaction();
    } catch (err) {
      await session.abortTransaction();
      console.error("Error in 'send reservation notification':", err);
    } finally {
      session.endSession();
    }
  });

  agenda.define('auto release seat', async (job) => {
    const { seatId, studentId, notificationId } = job.attrs.data;
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const seat = await Seat.findById(seatId).session(session);
      const notification = await SeatReservationNotification.findById(notificationId).session(session);

      if (!seat || seat.isAvailable || !notification) {
        await session.abortTransaction();
        return;
      }

      if (notification.actionResponse === 'pending') {
        seat.isAvailable = true;
        seat.reservedBy = null;
        seat.reservedAt = null;
        seat.releasedAt = new Date();
        await seat.save({ session });

        notification.requiresAction = false;
        notification.actionResponse = 'autoRelease';
        notification.message = `Seat ${seat.seatNumber} was auto-released.`;
        await notification.save({ session });

        await SeatReservationNotification.create([{
          studentId,
          seatId: seat._id,
          message: `Your seat ${seat.seatNumber} has been automatically released due to no response.`,
          isRead: false,
          requiresAction: false,
          actionResponse: 'autoRelease'
        }], { session });
      }

      await session.commitTransaction();
    } catch (err) {
      await session.abortTransaction();
      console.error("Error in 'auto release seat':", err);
    } finally {
      session.endSession();
    }
  });
};

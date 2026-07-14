// app/services/notificationService.js

const notificationModel = require('../repositories/notificationModel');
const userModel         = require('../repositories/userModel');
const { sendEmail }     = require('../email/emailService');
const {
    bloodDriveAssignmentEmail,
    donorPostExtractionEmail,
    inventoryLowEmail,
    inventoryExpiringEmail,
    requestSubmittedEmail,
} = require('../email/emailTemplates');
const { emitToRoom }        = require('../socket/socketHandler');
const staffModel            = require('../repositories/staffModel');
const { NOTIFICATION_TYPES } = require('../../constants/statuses');

async function notifyNewBloodRequest(request) {
    const { request_id, branch_id, patient_name, urgency_level } = request;

    const staffList = await staffModel.getStaffByBranch(branch_id);

    await Promise.all(
        staffList.map((staff) =>
            notificationModel.createNotification({
                user_id:        staff.user_id,
                type:           NOTIFICATION_TYPES.BLOOD_REQUEST_NEW,
                title:          'New Blood Request',
                message:        `A new blood request has been submitted for patient ${patient_name} (${urgency_level}).`,
                reference_id:   request_id,
                reference_type: 'blood_request',
            })
        )
    );

    emitToRoom(`branch_${branch_id}`, 'blood_request_new', {
        request_id,
        patient_name,
        urgency_level,
    });
}

/**
 * Email-only confirmation to the requestor that their submission was
 * received — bloodsync.md #32-33. No DB notification row, no socket event:
 * this fires the instant POST /api/blood-requests succeeds, before any
 * staff review has happened, so there's nothing status-related to show
 * in-app yet. Contrast with notifyRequestStatusChange below, which covers
 * the actual Approved/Waiting/Released/Rejected lifecycle and does write
 * a DB notification + socket event.
 * Looks up the requestor's email/name via userModel rather than requiring
 * the caller to pass them — createRequest() in bloodRequestService.js only
 * has user_id at hand, per contract.md's POST /api/blood-requests request
 * shape (no email field in the request body itself).
 */
async function notifyRequestorSubmission({ request_id, user_id, patient_name }) {
    const user = await userModel.getUserById(user_id);
    if (!user || !user.email) return; // defensive — should always exist, but a
                                       // fire-and-forget email must never throw

    await sendEmail({
        to:      user.email,
        subject: `Blood Request Received — Request #${request_id}`,
        html:    requestSubmittedEmail({
            name:         user.first_name,
            patient_name,
            request_id,
        }),
    });
}

/**
 * Notify a requestor when their blood request status changes.
 * Writes a DB notification + emits to their private socket room.
 * Called on: Approved, Rejected, Released.
 */
async function notifyRequestStatusChange({ request_id, user_id, new_status, patient_name, reason }) {
    const messages = {
        Approved: `Your blood request for patient ${patient_name} has been approved. Units are being reserved.`,
        Waiting:  `Your blood request for patient ${patient_name} is ready for pickup. Please proceed to the branch.`,
        Released: `Your blood request for patient ${patient_name} has been fulfilled. Blood units have been released.`,
        Rejected: `Your blood request for patient ${patient_name} has been rejected.${reason ? ` Reason: ${reason}` : ''}`,
    };

    const titles = {
        Approved: 'Blood Request Approved',
        Waiting:  'Blood Units Ready for Pickup',
        Released: 'Blood Request Fulfilled',
        Rejected: 'Blood Request Rejected',
    };

    await notificationModel.createNotification({
        user_id,
        type:           NOTIFICATION_TYPES.BLOOD_REQUEST_STATUS,
        title:          titles[new_status] || 'Blood Request Update',
        message:        messages[new_status] || `Your blood request status has changed to ${new_status}.`,
        reference_id:   request_id,
        reference_type: 'blood_request',
    });

    emitToRoom(`user_${user_id}`, 'blood_request_status', {
        request_id,
        new_status,
        patient_name,
        reason: reason || null,
    });
}

async function notifyBloodDriveAssigned(user, drive) {
    const { user_id, first_name, email } = user;
    const {
        drive_id,
        name: drive_name,
        start_datetime,
        venue_name,
        role,
        confirmation_token,
    } = drive;

    const baseUrl    = process.env.APP_URL || 'http://localhost:3000';
    const confirmUrl = `${baseUrl}/api/blood-drives/confirm?token=${confirmation_token}&action=confirm`;
    const declineUrl = `${baseUrl}/api/blood-drives/confirm?token=${confirmation_token}&action=decline`;

    await notificationModel.createNotification({
        user_id,
        type:           NOTIFICATION_TYPES.BLOOD_DRIVE_ASSIGNED,
        title:          'Blood Drive Assignment',
        message:        `You have been assigned to the blood drive: ${drive_name}.`,
        reference_id:   drive_id,
        reference_type: 'blood_drive',
    });

    await sendEmail({
        to:      email,
        subject: `Blood Drive Assignment — ${drive_name}`,
        html:    bloodDriveAssignmentEmail({
            name:       first_name,
            drive_name,
            drive_date: new Date(start_datetime).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' }),
            venue:      venue_name,
            role,
            confirmUrl,
            declineUrl,
        }),
    });
}

async function notifyDonorPostExtraction(donor, donation) {
    const { first_name, email } = donor;
    const { extraction_date, component, next_eligible_date } = donation;

    await sendEmail({
        to:      email,
        subject: 'Thank You for Your Blood Donation',
        html:    donorPostExtractionEmail({
            name:               first_name,
            donation_date:      new Date(extraction_date).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' }),
            component,
            next_eligible_date: new Date(next_eligible_date).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' }),
        }),
    });
}

async function notifyInventoryLow(branch_id, branch_name, items) {
    const staffList = await staffModel.getStaffByBranch(branch_id);
    const admins    = await staffModel.getAllAdmins();

    const recipients = [
        ...staffList,
        ...admins.filter((a) => !staffList.find((s) => s.user_id === a.user_id)),
    ];

    await Promise.all(
        recipients.map((recipient) =>
            notificationModel.createNotification({
                user_id:        recipient.user_id,
                type:           NOTIFICATION_TYPES.INVENTORY_LOW,
                title:          'Low Blood Inventory Alert',
                message:        `Blood inventory at ${branch_name} is running low for ${items.length} component(s).`,
                reference_type: 'branch',
                reference_id:   branch_id,
            })
        )
    );

    await Promise.all(
        recipients.map((recipient) =>
            sendEmail({
                to:      recipient.email,
                subject: `Low Blood Inventory Alert — ${branch_name}`,
                html:    inventoryLowEmail({ branch_name, items }),
            })
        )
    );

    emitToRoom(`branch_${branch_id}`, 'inventory_low', { branch_id, items });
}

async function notifyInventoryExpiring(branch_id, branch_name, items) {
    const staffList = await staffModel.getStaffByBranch(branch_id);
    const admins    = await staffModel.getAllAdmins();

    const recipients = [
        ...staffList,
        ...admins.filter((a) => !staffList.find((s) => s.user_id === a.user_id)),
    ];

    await Promise.all(
        recipients.map((recipient) =>
            notificationModel.createNotification({
                user_id:        recipient.user_id,
                type:           NOTIFICATION_TYPES.INVENTORY_EXPIRING,
                title:          'Near-Expiry Blood Inventory Alert',
                message:        `${items.length} blood unit(s) at ${branch_name} are nearing expiry.`,
                reference_type: 'branch',
                reference_id:   branch_id,
            })
        )
    );

    await Promise.all(
        recipients.map((recipient) =>
            sendEmail({
                to:      recipient.email,
                subject: `Near-Expiry Inventory Alert — ${branch_name}`,
                html:    inventoryExpiringEmail({ branch_name, items }),
            })
        )
    );

    emitToRoom(`branch_${branch_id}`, 'inventory_expiring', { branch_id, items });
}

module.exports = {
    notifyNewBloodRequest,
    notifyRequestorSubmission, 
    notifyRequestStatusChange,
    notifyBloodDriveAssigned,
    notifyDonorPostExtraction,
    notifyInventoryLow,
    notifyInventoryExpiring,
};
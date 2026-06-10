// app/services/notificationService.js

const notificationModel = require('../repositories/notificationModel');
const { sendEmail } = require('../email/emailService');
const {
  bloodDriveAssignmentEmail,
  donorPostExtractionEmail,
  inventoryLowEmail,
  inventoryExpiringEmail,
} = require('../email/emailTemplates');
const { emitToRoom } = require('../socket/socketHandler');
const staffModel = require('../repositories/staffModel');

async function notifyNewBloodRequest(request) {
  const { request_id, branch_id, patient_name, urgency_level } = request;

  const staffList = await staffModel.getStaffByBranch(branch_id);

  await Promise.all(
    staffList.map((staff) =>
      notificationModel.createNotification({
        user_id: staff.user_id,
        type: 'blood_request_new',
        title: 'New Blood Request',
        message: `A new blood request has been submitted for patient ${patient_name} (${urgency_level}).`,
        reference_id: request_id,
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

  const baseUrl = process.env.APP_URL || 'http://localhost:3000';
  const confirmUrl = `${baseUrl}/api/blood-drives/confirm?token=${confirmation_token}&action=confirm`;
  const declineUrl = `${baseUrl}/api/blood-drives/confirm?token=${confirmation_token}&action=decline`;

  await notificationModel.createNotification({
    user_id,
    type:           'blood_drive_assigned',
    title:          'Blood Drive Assignment',
    message:        `You have been assigned to the blood drive: ${drive_name}.`,
    reference_id:   drive_id,
    reference_type: 'blood_drive',
  });

  await sendEmail({
    to:      email,
    subject: `Blood Drive Assignment — ${drive_name}`,
    html:    bloodDriveAssignmentEmail({
      name:        first_name,
      drive_name,
      drive_date:  new Date(start_datetime).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' }),
      venue:       venue_name,
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
    to: email,
    subject: 'Thank You for Your Blood Donation',
    html: donorPostExtractionEmail({
      name: first_name,
      donation_date: new Date(extraction_date).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' }),
      component,
      next_eligible_date: new Date(next_eligible_date).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' }),
    }),
  });
}

async function notifyInventoryLow(branch_id, branch_name, items) {
  const staffList = await staffModel.getStaffByBranch(branch_id);
  const admins = await staffModel.getAllAdmins();

  const recipients = [
    ...staffList,
    ...admins.filter((a) => !staffList.find((s) => s.user_id === a.user_id)),
  ];

  await Promise.all(
    recipients.map((recipient) =>
      notificationModel.createNotification({
        user_id: recipient.user_id,
        type: 'inventory_low',
        title: 'Low Blood Inventory Alert',
        message: `Blood inventory at ${branch_name} is running low for ${items.length} component(s).`,
        reference_type: 'branch',
        reference_id: branch_id,
      })
    )
  );

  await Promise.all(
    recipients.map((recipient) =>
      sendEmail({
        to: recipient.email,
        subject: `Low Blood Inventory Alert — ${branch_name}`,
        html: inventoryLowEmail({ branch_name, items }),
      })
    )
  );

  emitToRoom(`branch_${branch_id}`, 'inventory_low', { branch_id, items });
}

async function notifyInventoryExpiring(branch_id, branch_name, items) {
  const staffList = await staffModel.getStaffByBranch(branch_id);
  const admins = await staffModel.getAllAdmins();

  const recipients = [
    ...staffList,
    ...admins.filter((a) => !staffList.find((s) => s.user_id === a.user_id)),
  ];

  await Promise.all(
    recipients.map((recipient) =>
      notificationModel.createNotification({
        user_id: recipient.user_id,
        type: 'inventory_expiring',
        title: 'Near-Expiry Blood Inventory Alert',
        message: `${items.length} blood unit(s) at ${branch_name} are nearing expiry.`,
        reference_type: 'branch',
        reference_id: branch_id,
      })
    )
  );

  await Promise.all(
    recipients.map((recipient) =>
      sendEmail({
        to: recipient.email,
        subject: `Near-Expiry Inventory Alert — ${branch_name}`,
        html: inventoryExpiringEmail({ branch_name, items }),
      })
    )
  );

  emitToRoom(`branch_${branch_id}`, 'inventory_expiring', { branch_id, items });
}

module.exports = {
  notifyNewBloodRequest,
  notifyBloodDriveAssigned,
  notifyDonorPostExtraction,
  notifyInventoryLow,
  notifyInventoryExpiring,
};
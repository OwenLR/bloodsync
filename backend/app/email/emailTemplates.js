// app/email/emailTemplates.js

function bloodDriveAssignmentEmail({ name, drive_name, drive_date, venue, role, confirmUrl, declineUrl }) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #c0392b;">Blood Drive Assignment</h2>
      <p>Hi ${name},</p>
      <p>You have been assigned to the following blood drive:</p>
      <ul>
        <li><strong>Drive:</strong> ${drive_name}</li>
        <li><strong>Date:</strong> ${drive_date}</li>
        <li><strong>Venue:</strong> ${venue}</li>
        <li><strong>Your Role:</strong> ${role || 'Not specified'}</li>
      </ul>
      <p>Please confirm or decline your participation by clicking one of the buttons below:</p>
      <div style="margin: 24px 0;">
        <a href="${confirmUrl}"
           style="background-color: #27ae60; color: white; padding: 12px 24px;
                  text-decoration: none; border-radius: 4px; margin-right: 12px;
                  display: inline-block;">
          Confirm Participation
        </a>
        <a href="${declineUrl}"
           style="background-color: #c0392b; color: white; padding: 12px 24px;
                  text-decoration: none; border-radius: 4px;
                  display: inline-block;">
          Decline Assignment
        </a>
      </div>
      <p style="color: #888; font-size: 13px;">
        Each button can only be used once. If you need to change your response,
        please contact your branch coordinator directly.
      </p>
      <p>— Philippine Red Cross Batangas</p>
    </div>
  `;
}

function donorPostExtractionEmail({ name, donation_date, component, next_eligible_date }) {
  return `
    <h2>Thank You for Your Donation</h2>
    <p>Hi ${name},</p>
    <p>Your blood donation has been successfully recorded.</p>
    <ul>
      <li><strong>Date:</strong> ${donation_date}</li>
      <li><strong>Component:</strong> ${component}</li>
      <li><strong>Next Eligible Donation Date:</strong> ${next_eligible_date}</li>
    </ul>
    <p>Your contribution saves lives. Thank you.</p>
    <p>— Philippine Red Cross Batangas</p>
  `;
}

function inventoryLowEmail({ branch_name, items }) {
  const rows = items.map(item => `
    <tr>
      <td>${item.blood_type}</td>
      <td>${item.component}</td>
      <td>${item.count}</td>
    </tr>
  `).join('');

  return `
    <h2>Low Blood Inventory Alert</h2>
    <p>The following blood components at <strong>${branch_name}</strong> are running low:</p>
    <table border="1" cellpadding="6" cellspacing="0">
      <thead>
        <tr>
          <th>Blood Type</th>
          <th>Component</th>
          <th>Available Units</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <p>Please take necessary action.</p>
    <p>— BloodSync System</p>
  `;
}

function inventoryExpiringEmail({ branch_name, items }) {
  const rows = items.map(item => `
    <tr>
      <td>${item.blood_type}</td>
      <td>${item.component}</td>
      <td>${item.expiration_date}</td>
      <td>${item.days_remaining}</td>
    </tr>
  `).join('');

  return `
    <h2>Near-Expiry Blood Inventory Alert</h2>
    <p>The following blood units at <strong>${branch_name}</strong> are nearing expiry:</p>
    <table border="1" cellpadding="6" cellspacing="0">
      <thead>
        <tr>
          <th>Blood Type</th>
          <th>Component</th>
          <th>Expiration Date</th>
          <th>Days Remaining</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <p>Please prioritize these units or take appropriate action.</p>
    <p>— BloodSync System</p>
  `;
}

// Sent to newly created Admin or PRC Staff accounts.
// Plain-text password included once — user is encouraged to change it.
function adminWelcomeEmail({ name, email, password, role_name }) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #c0392b;">Welcome to BloodSync</h2>
      <p>Hi ${name},</p>
      <p>An account has been created for you on the BloodSync system with the role of <strong>${role_name}</strong>.</p>
      <p>Here are your login credentials:</p>
      <table style="border-collapse: collapse; margin: 16px 0;">
        <tr>
          <td style="padding: 6px 12px 6px 0; font-weight: bold;">Email:</td>
          <td style="padding: 6px 0;">${email}</td>
        </tr>
        <tr>
          <td style="padding: 6px 12px 6px 0; font-weight: bold;">Password:</td>
          <td style="padding: 6px 0; font-family: monospace; font-size: 15px;">${password}</td>
        </tr>
      </table>
      <p>
        We recommend changing your password after your first login for security.
        You can do so anytime from your account settings.
      </p>
      <p style="color: #888; font-size: 13px;">
        If you did not expect this email, please contact your branch administrator immediately.
      </p>
      <p>— Philippine Red Cross Batangas</p>
    </div>
  `;
}

module.exports = {
  bloodDriveAssignmentEmail,
  donorPostExtractionEmail,
  inventoryLowEmail,
  inventoryExpiringEmail,
  adminWelcomeEmail,
};
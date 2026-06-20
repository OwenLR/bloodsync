import { requireAuth }     from '../../core/guards/authGuard.js';
import { requireRole }     from '../../core/guards/roleGuard.js';
import { renderNavbar }    from '../../layouts/navbar.js';
import { renderSidebar,
         clearSidebar }    from '../../layouts/sidebar.js';
import { revealAppShell }  from '../../layouts/appShell.js';
import { getSidebarItems } from '../../constants/sidebarItems.js';
import { ROLES }           from '../../constants/roles.js';
import { renderDrivesTable, initParticipantPanel } from '../../features/bloodDrives/bloodDrivesUI.js';

async function init() {
  const user = await requireAuth();
  if (!user) return;

  if (!requireRole(user, [ROLES.ADMIN])) return;

  const unreadCount = 0;
  renderNavbar(user, unreadCount);

  clearSidebar();
  renderSidebar(getSidebarItems(user.role_id, 'general'), 'General');
  renderSidebar(getSidebarItems(user.role_id, 'management'), 'Management');

  revealAppShell();

  initParticipantPanel();
  await renderDrivesTable(user);

  // secondary close button in modal footer
  document.getElementById('cancel-modal-close-footer')?.addEventListener('click', () => {
    import('../../components/modal.js').then(({ closeModal }) => closeModal('cancel-modal'));
  });
}

init();
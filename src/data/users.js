const { hashPasswordSync } = require('../utils/password');

function createInitialUsers() {
  return [
    {
      id: 1,
      username: 'admin',
      displayName: 'System Administrator',
      passwordHash: hashPasswordSync('AdminPass123!'),
      role: 'admin',
      lastLogin: null,
      activeSessionId: null,
      passwordResetTokenHash: null,
      passwordResetTokenExpiresAt: null,
      passwordResetTokenUsed: false
    },
    {
      id: 2,
      username: 'moderator',
      displayName: 'Demo Moderator',
      passwordHash: hashPasswordSync('ModeratorPass123!'),
      role: 'moderator',
      lastLogin: null,
      activeSessionId: null,
      passwordResetTokenHash: null,
      passwordResetTokenExpiresAt: null,
      passwordResetTokenUsed: false
    },
    {
      id: 3,
      username: 'user1',
      displayName: 'Regular User',
      passwordHash: hashPasswordSync('UserPass123!'),
      role: 'user',
      lastLogin: null,
      activeSessionId: null,
      passwordResetTokenHash: null,
      passwordResetTokenExpiresAt: null,
      passwordResetTokenUsed: false
    }
  ];
}

module.exports = {
  createInitialUsers
};

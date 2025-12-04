const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../config/database');

class ApprovalTokenService {
  constructor() {
    this.secret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
  }

  /**
   * Generate a secure approval token for a specific approver and application
   */
  async generateApprovalToken(applicationId, approverEmail, approverRole, approverName) {
    try {
      // Generate a unique token using JWT
      const tokenPayload = {
        applicationId,
        approverEmail,
        approverRole,
        timestamp: Date.now(),
        nonce: crypto.randomBytes(16).toString('hex')
      };

      const token = jwt.sign(tokenPayload, this.secret, { 
        expiresIn: '30d', // Token expires in 30 days
        issuer: 'workflow-management-system',
        subject: 'approval-request'
      });

      // Calculate expiration date (30 days from now)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      // Store token in database
      await db.run(`
        INSERT INTO approval_tokens (
          token, application_id, approver_email, approver_role, approver_name, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, [token, applicationId, approverEmail, approverRole, approverName, expiresAt.toISOString()]);

      return token;
    } catch (error) {
      console.error('Error generating approval token:', error);
      throw new Error('Failed to generate approval token');
    }
  }

  /**
   * Validate an approval token and return its details
   */
  async validateToken(token) {
    try {
      // First verify the JWT signature and decode
      const decoded = jwt.verify(token, this.secret);

      // Check if token exists in database and is not used
      const tokenRecord = await db.get(`
        SELECT * FROM approval_tokens 
        WHERE token = ? AND used = FALSE AND expires_at > datetime('now')
      `, [token]);

      if (!tokenRecord) {
        throw new Error('Token not found, already used, or expired');
      }

      return {
        ...tokenRecord,
        decoded
      };
    } catch (error) {
      console.error('Token validation error:', error);
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Mark a token as used
   */
  async markTokenAsUsed(token) {
    try {
      const result = await db.run(`
        UPDATE approval_tokens 
        SET used = TRUE, used_at = datetime('now') 
        WHERE token = ?
      `, [token]);

      if (result.changes === 0) {
        throw new Error('Token not found');
      }

      return true;
    } catch (error) {
      console.error('Error marking token as used:', error);
      throw new Error('Failed to mark token as used');
    }
  }

  /**
   * Check if a specific approver role has already been used for an application
   */
  async hasRoleAlreadyApproved(applicationId, approverRole) {
    try {
      const result = await db.get(`
        SELECT COUNT(*) as count 
        FROM approval_tokens 
        WHERE application_id = ? AND approver_role = ? AND used = TRUE
      `, [applicationId, approverRole]);

      return result.count > 0;
    } catch (error) {
      console.error('Error checking role approval status:', error);
      return false;
    }
  }

  /**
   * Get all tokens for an application (for debugging/admin purposes)
   */
  async getApplicationTokens(applicationId) {
    try {
      return await db.all(`
        SELECT token, approver_email, approver_role, approver_name, used, used_at, created_at, expires_at
        FROM approval_tokens 
        WHERE application_id = ?
        ORDER BY created_at ASC
      `, [applicationId]);
    } catch (error) {
      console.error('Error fetching application tokens:', error);
      return [];
    }
  }

  /**
   * Clean up expired tokens (can be run as a cron job)
   */
  async cleanupExpiredTokens() {
    try {
      const result = await db.run(`
        DELETE FROM approval_tokens 
        WHERE expires_at < datetime('now')
      `);

      console.log(`Cleaned up ${result.changes} expired tokens`);
      return result.changes;
    } catch (error) {
      console.error('Error cleaning up expired tokens:', error);
      return 0;
    }
  }

  /**
   * Get the display name for an approver role
   */
  getApproverDisplayName(approverRole, approverName = null, facultyInstitution = null) {
    const roleNames = {
      'ccc_associate_dean': 'CCC Associate Dean',
      'department_chair': (() => {
        const title = facultyInstitution === 'vumc' ? 'Primary Chair' : 'Department Chair';
        return approverName ? `${approverName} (${title})` : title;
      })(),
      'division_chair': approverName ? `${approverName} (Division Leader)` : 'Division Leader', 
      'dean': approverName ? `${approverName} (Dean)` : 'Dean',
      'viceDean': approverName ? `${approverName} (Vice Dean)` : 'Vice Dean',
      'senior_associate_dean': approverName ? `${approverName} (Associate Dean)` : 'Associate Dean'
    };

    return roleNames[approverRole] || approverRole;
  }
}

module.exports = new ApprovalTokenService();
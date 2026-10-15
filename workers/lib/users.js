'use strict'

class UserService {
  constructor ({ sqlite, auth }) {
    this._auth = auth
    this._sqlite = sqlite
  }

  async init () {
    await this._sqlite.execAsync('CREATE TABLE IF NOT EXISTS oauth_subjects (userId INTEGER NOT NULL, email TEXT NOT NULL, provider TEXT NOT NULL, subject TEXT NOT NULL, PRIMARY KEY (userId, email, provider))')
  }

  // First login binds the provider's immutable subject; a later login for the same row and email must present it again
  async bindOAuthSubject (email, provider, subject) {
    const user = await this._auth.getUserByEmail(email)
    if (!user) return

    const key = [user.id, email, provider]
    await this._sqlite.runAsync('INSERT OR IGNORE INTO oauth_subjects (userId, email, provider, subject) VALUES (?, ?, ?, ?)', [...key, subject])
    const bound = await this._sqlite.getAsync('SELECT subject FROM oauth_subjects WHERE userId = ? AND email = ? AND provider = ?', key)
    if (bound.subject !== subject) {
      throw new Error('ERR_USER_INVALID')
    }
  }

  async hasCreatedUsers () {
    const row = await this._sqlite.getAsync('SELECT seq FROM sqlite_sequence WHERE name = \'users\'')
    return row?.seq > 1
  }

  parseUserRow (userRow) {
    const { email, roles, name, id, lastActiveAt } = userRow
    const role = JSON.parse(roles)[0]
    return {
      id,
      email,
      name,
      role,
      lastActiveAt
    }
  }

  async createUser ({ email, name, role }) {
    const normalizedEmail = email.toLowerCase()
    await this._auth.createUser({
      email: normalizedEmail,
      name,
      roles: [role]
    })

    const user = await this._auth.getUserByEmail(normalizedEmail)
    return this.parseUserRow(user)
  }

  async listUsers () {
    const userRows = await this._auth.listUsers()

    return userRows.filter(user => user.id !== 1).map(this.parseUserRow.bind(this))
  }

  async updateUser ({ id, email, name = null, role, callerRoles }) {
    const targetUser = await this._auth.getUserById(id)
    if (!targetUser) {
      throw new Error('ERR_USER_NOT_FOUND')
    }

    const token = await this._auth.genToken({
      ips: ['127.0.0.1'],
      userId: id,
      roles: callerRoles
    })

    await this._auth.updateUser({
      token,
      email: email.toLowerCase(),
      name,
      roles: [role]
    })

    const user = await this._auth.getUserById(id)
    return this.parseUserRow(user)
  }

  deleteUser (id) {
    return this._auth.deleteUser(id)
  }

  getUser (id) {
    return this._auth.getUserById(id)
  }
}

module.exports = {
  UserService
}

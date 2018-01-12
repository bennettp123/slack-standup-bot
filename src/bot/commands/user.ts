import { register } from '../command'
import { toggleUser } from '../../config'

register(
  'adduser',
  'Add user to standup. Usage: adduser [username]',
  async (bot, msg, cfg, params) => {
    const username = params[0]
    try {
      const userInfo = await bot.getUser(username)
      if (!userInfo) {
        throw new Error()
      }

      await toggleUser(username, 'add')
      await bot.postMessage(msg.channel, `User *${username}* added to standup`, cfg.defaultParams)
    } catch (ex) {
      await bot.postMessage(msg.channel, `User *${username}* does not exist`, cfg.defaultParams)
    }
  }
)

register(
  'deluser',
  'Remove user to standup. Usage: deluser [username]',
  async (bot, msg, cfg, params) => {
    const username = params[0]
    try {
      const userInfo = await bot.getUser(username)
      if (!userInfo) {
        throw new Error()
      }

      await toggleUser(username, 'del')
      await bot.postMessage(
        msg.channel,
        `User *${username}* removed from standup`,
        cfg.defaultParams
      )
    } catch (ex) {
      await bot.postMessage(msg.channel, `User *${username}* does not exist`, cfg.defaultParams)
    }
  }
)

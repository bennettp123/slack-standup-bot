import { register } from '../command'
import { default as fetch } from 'node-fetch'
import { Config } from '../../config'
import { Buffer } from 'buffer'

const roles: any = {}

let jiraRef: string

register('assign', 'Assign a role', async (bot, message, config, params) => {
  const assignee = params[0]
  const role = params.slice(-2).join(' ')
  roles[role] = assignee

  await bot.postMessage({
    channel: message.channel,
    text: `[${jiraRef ? jiraRef : 'OPS-???'}] ${assignee} has been assigned to the ${role} role`,
    ...config.defaultParams
  })
})

register('roles', 'List assigned roles', async (bot, message, config, params) => {
  let msg = `[${jiraRef ? jiraRef : 'OPS-???'}] The following roles are assigned:\n`
  for (var role in roles) {
    msg = msg + `${role}: ${roles[role]}\n`
  }

  await bot.postMessage({
    channel: message.channel,
    text: msg,
    ...config.defaultParams
  })
})

register('raise', `Raise an incident record in JIRA`, async (bot, message, config, params) => {
  await bot.postMessage({
    channel: message.channel,
    text: `K. Hold on...`,
    ...config.defaultParams
  })

  /**
   * Create JIRA ticket
   */
  const title: string = params.join(' ')
  const req = {
    fields: {
      project: {
        key: 'OPS'
      },
      summary: title,
      description: 'Description of incident',
      issuetype: {
        name: 'Incident'
      }
    }
  }

  const authHash: string = new Buffer(config.jiraUsername + ':' + config.jiraPassword).toString(
    'base64'
  )
  const res = await fetch('https://jira.swmdigital.io/rest/api/latest/issue', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Basic ' + authHash
    },
    body: JSON.stringify(req)
  })
  if (res.status !== 201) {
    await bot.postMessage({
      channel: message.channel,
      text: `Something went wrong. Please raise an incident ;) - ${res.statusText}`,
      ...config.defaultParams
    })
    return
  }
  const ticket: any = await res.json()
  jiraRef = ticket.key

  /**
   * Raise Confluence ticket
   */
  const doc = await createConfluenceDoc(ticket.key + ` ` + title, config)

  await bot.postMessage({
    channel: message.channel,
    text: `Yep. Good. I've raised https://jira.swmdigital.io/browse/${ticket.key}\nJournal: ${doc}`,
    ...config.defaultParams
  })
})

const createConfluenceDoc = async (title: string, config: Config): Promise<string> => {
  return new Promise<string>(async (resolve, reject) => {
    const authHash: string = new Buffer(
      config.confluenceUsername + ':' + config.confluencePassword
    ).toString('base64')

    // read existing template
    let res = await fetch(
      'https://confluence.swmdigital.io/rest/api/content/7444590?expand=body.storage',
      {
        headers: {
          Authorization: 'Basic ' + authHash
        }
      }
    )
    if (res.status !== 200) {
      reject(res)
    }
    const tmpl: any = await res.json()

    // create new document
    const req: any = {
      type: 'page',
      title: title,
      space: { key: 'CYEX' },
      body: {
        storage: { value: tmpl.body.storage.value, representation: 'storage' }
      },
      ancestors: [{ id: 4751554 }]
    }
    res = await fetch('https://confluence.swmdigital.io/rest/api/content', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Basic ' + authHash
      },
      body: JSON.stringify(req)
    })
    if (res.status !== 200) {
      reject(res)
    }
    const doc: any = await res.json()
    resolve('https://confluence.swmdigital.io' + doc._links.webui)
  })
}

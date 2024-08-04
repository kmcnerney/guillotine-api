const express = require('express')
const cors = require('cors')

const { Builder, Browser, By, until } = require('selenium-webdriver')
const chrome = require('selenium-webdriver/chrome')

const chromeOptions = new chrome.Options()
chromeOptions.addArguments('--headless')
chromeOptions.addArguments('--no-sandbox')
chromeOptions.addArguments('--disable-dev-shm-usage')

const MFA_DELAY = 10 * 1000 // 10 seconds

let driver
async function startBrowser() {
  if (driver) {
    console.log('quitting browser')
    try {
      await driver.quit()
    } catch (e) {
      console.error('failed to quit browser')
    }
  }
  console.log('creating new browser')
  driver = new Builder().forBrowser(Browser.CHROME).setChromeOptions(chromeOptions).build()
}

/**
 * Logs into the Yahoo Fantasy Football website.
 * @returns {Promise<void>} A promise that resolves once the login process is complete.
 */
async function login() {
  await startBrowser();

  try {
    console.log('opening league page')
    await driver.get('https://football.fantasysports.yahoo.com/f1/789266')

    console.log('entering username')
    await driver.wait(until.elementLocated(By.id('login-username')), 5000)
    await driver.findElement(By.id('login-username')).sendKeys('mcnerney_kevin')
    await driver.findElement(By.id('login-signin')).click()

    console.log('entering password')
    await driver.wait(until.elementLocated(By.id('login-passwd')), 5000)
    await driver.findElement(By.id('login-passwd')).sendKeys('GuillotineEasy1!')
    await driver.findElement(By.id('login-signin')).click()

    await new Promise((r) => setTimeout(r, 1000))
    const pageSource = await driver.getPageSource()
    if (pageSource.includes('Stay&nbsp;verified')) {
      console.log('Yahoo is asking to stay verified. Clicking Yes')
      const stayVerifiedButton = await driver.findElement(By.className('puree-button-primary'))
      await stayVerifiedButton.click()
    }

    console.log('waiting for mfa')
    await driver.wait(until.elementLocated(By.id('matchupweek')), MFA_DELAY)
    console.log('Logged into Yahoo')
  } catch (e) {
    console.error('Failed to login to Yahoo', e)
  }
}

const TABLE_CELL_INDICES = {
  RANK: 0,
  TEAM: 2,
  CURRENT: 4,
  PROJECTION: 3,
}

async function getLiveProjections() {
  try {
    console.log('refreshing page')
    await driver.navigate().refresh()
    console.log('refreshed')
    await driver.wait(until.elementLocated(By.id('matchupweek')), 5000)
  } catch (e) {
    console.error('failed to find league page, need to re-login')
    await login()
  }

  try {
    // const pageSource = await driver.getPageSource()
    // if (pageSource.includes('Final results')) {
    //   console.log('Skipping to next week projections')
    //   await driver.wait(until.elementIsVisible(driver.findElement(By.className('Js-next'))), 5000)
    //   await driver.wait(until.elementIsEnabled(driver.findElement(By.className('Js-next'))), 5000)
    //   const nextButton = await driver.findElement(By.className('Js-next'))
    //   await nextButton.click()
    //   await new Promise((r) => setTimeout(r, 500))
    // }

    console.log('extracting scores')
    const weeklySection = await driver.findElement(By.id('matchupweek'))
    const leagueTable = await weeklySection.findElements(By.className('Table'))
    const leagueTableBody = await leagueTable[0].findElements(By.tagName('tbody'))
    const teams = await leagueTableBody[0].findElements(By.tagName('tr'))

    const scores = []
    for (const team of teams) {
      const cells = await team.findElements(By.tagName('td'))
      const teamCell = await cells[TABLE_CELL_INDICES.TEAM].findElements(By.tagName('a'))
      scores.push({
        teamName: await teamCell[0].getAttribute('innerHTML'),
        projectedPts: parseFloat(await cells[TABLE_CELL_INDICES.PROJECTION].getAttribute('innerHTML')),
        currentPts: parseFloat(await cells[TABLE_CELL_INDICES.CURRENT].getAttribute('innerHTML')),
        overallRank: parseInt(await cells[TABLE_CELL_INDICES.RANK].getAttribute('innerHTML')),
      })
    }
    scores.sort(
      (a, b) => b.projectedPts - a.projectedPts || a.overallRank - b.overallRank
    )
    return scores
  } catch (e) {
    console.error('failed to extract scores', e)
    return []
  }
}

login()

const app = express()
const port = process.env.PORT || 3001
app.use(cors())

let lock = false
let globalScores = []
app.get('/live-projections', async (req, res) => {
  if (lock) {
    console.log('another user is already checking scores, just give the latest')
    return res.send(globalScores)
  }
  console.log('requesting live projections')
  lock = true

  try {
    const results = await getLiveProjections()
    console.log('got new scores')
    globalScores = results
    res.send(globalScores)
  } catch (error) {
    console.error('failed to get live projections', error)
    res.status(500).send('Failed to get live projections')
  }

  lock = false
})

app.get('/', async (req, res) => {
  try {
    res.send('Server is healthy')
  } catch (e) {
    console.error('Failed pulse: ', e)
    res.status(500).send('Server is unhealthy!')
  }
})

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`)
})

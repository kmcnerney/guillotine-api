const express = require('express')
const cors = require('cors')

const { Builder, By, until } = require('selenium-webdriver')
require('chromedriver')
const chrome = require('selenium-webdriver/chrome')

let chromeOptions = new chrome.Options()
chromeOptions.setChromeBinaryPath(process.env.CHROME_BINARY_PATH)
let serviceBuilder = new chrome.ServiceBuilder(process.env.CHROME_DRIVER_PATH)

//chromeOptions.addArguments("--headless")
chromeOptions.addArguments("--disable-gpu")
chromeOptions.addArguments("--no-sandbox")
chromeOptions.addArguments('--disable-dev-shm-usage')

const app = express()
const port = process.env.PORT || 3001
app.use(cors())

const MFA_DELAY = 10 * 1000 // 10 seconds

let driver
async function login() {
  try {
    driver = new Builder()
      .forBrowser('chrome')
      .setChromeOptions(chromeOptions)
      .setChromeService(serviceBuilder)
      .build()

    await driver.get('https://football.fantasysports.yahoo.com/f1/338574')

    await driver.wait(until.elementLocated(By.id('login-username')), 5000)
    await driver.findElement(By.id('login-username')).sendKeys('mcnerney_kevin')
    await driver.findElement(By.id('login-signin')).click()
    
    await driver.wait(until.elementLocated(By.id('login-passwd')), 5000)
    await driver.findElement(By.id('login-passwd')).sendKeys('GuillotineEasy1!')
    await driver.findElement(By.id('login-signin')).click()

    await new Promise(r => setTimeout(r, 1000))
    const pageSource = await driver.getPageSource()
    if(pageSource.includes('Stay&nbsp;verified')) {
      console.log('Yahoo is asking to stay verified. Clicking Yes')
      const stayVerifiedButton = await driver.findElement(By.className('puree-button-primary'))
      await stayVerifiedButton.click()
    }
    
    await driver.wait(until.elementLocated(By.id('matchupweek')), MFA_DELAY)
    console.log('Logged into Yahoo')

  } catch (e) {
    console.error('Failed to login to Yahoo', e)
    // const pageSource = await driver.getPageSource();
    // console.log('current page', pageSource);
    await driver.quit()
    driver = new Builder()
      .forBrowser('chrome')
      .setChromeOptions(chromeOptions)
      .setChromeService(serviceBuilder)
      .build()
  }
}

const TABLE_CELL_INDICES = {
  TEAM: 2,
  CURRENT: 4,
  PROJECTION: 3,
}

async function getLiveProjections() {
  let scores = []
  try {
    await driver.navigate().refresh()
    await new Promise(r => setTimeout(r, 1000))
    await driver.wait(until.elementLocated(By.id('matchupweek')), 5000)

    const pageSource = await driver.getPageSource();
    if(pageSource.includes('Final results')) {
      console.log('Skipping to next week projections')
      await driver.wait(until.elementIsVisible(driver.findElement(By.className('Js-next'))), 5000)
      await driver.wait(until.elementIsEnabled(driver.findElement(By.className('Js-next'))), 5000)
      const nextButton = await driver.findElement(By.className('Js-next'))
      //await nextButton.click()
      await new Promise(r => setTimeout(r, 500))
    }

    const weeklySection = await driver.findElement(By.id('matchupweek'))
    const leagueTable = await weeklySection.findElements(By.className('Table'))
    const leagueTableBody = await leagueTable[0].findElements(By.tagName('tbody'))
    const teams = await leagueTableBody[0].findElements(By.tagName('tr'))

    for(const team of teams) {
      const cells = await team.findElements(By.tagName('td'))
      const teamCell = await cells[TABLE_CELL_INDICES.TEAM].findElements(By.tagName('a'))
      const placeCell = await cells[TABLE_CELL_INDICES.TEAM].findElements(By.className('Mstart-med'))
      scores.push({
        teamName: await teamCell[0].getAttribute('innerHTML'),
        projectedPts: parseFloat(await cells[TABLE_CELL_INDICES.PROJECTION].getAttribute('innerHTML')),
        currentPts: parseFloat(await cells[TABLE_CELL_INDICES.CURRENT].getAttribute('innerHTML')),
        overallRank: parseInt(await placeCell[0].getAttribute('innerHTML'))
      })
    }
  } catch (e) {
    console.error('Failed to get live projections from Yahoo', e)
    await driver.quit()
    login()
    return []
  }

  scores.sort((a, b) => b.projectedPts - a.projectedPts || a.overallRank - b.overallRank);
  return scores
}

login()

let lock = false
let globalScores = []
app.get('/live-projections', async (req, res) => {
  if (lock) {
    console.log('another user is already checking scores, just give the latest')
    return res.send(globalScores)
  }
  lock = true

  try {
    const results = await getLiveProjections()
    console.log('got new scores', results)
    globalScores = results
    res.send(globalScores)
  } catch (error) {
    console.error('Failed to get live projections: ', error);
    res.status(500).send('Failed to get live projections');
  }

  lock = false
});

app.get('/', async (req, res) => {
  try {
    res.send('Server is healthy');
  } catch (e) {
    console.error('Failed pulse: ', e);
    res.status(500).send('Server is unhealthy!');
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});